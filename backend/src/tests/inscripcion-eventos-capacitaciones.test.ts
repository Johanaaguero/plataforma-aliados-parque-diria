import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import type { Connection } from 'mysql2/promise';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';
import { config } from 'dotenv';
import express from 'express';
import type { DataSource } from 'typeorm';

import {
  EventosCapacitaciones,
  EstadoEventoCapacitacion,
  Temporada,
  TipoActividad,
} from '../models/EventosCapacitaciones';
import { EstadoReserva as EstadoParticipante, Participantes } from '../models/Participantes';
import { EstadoReserva, Reserva } from '../models/Reserva';
import { ComprobantePago } from '../models/ComprobantePago';
import { establecerStoragePrivadoParaPruebas, type StorageService } from '../services/StorageService';
import type { AuditLog } from '../models/AuditLog';
import type { Rol, NombreRol } from '../models/Rol';
import type { Usuario } from '../models/Usuario';
import { errorMiddleware } from '../middlewares/registro.middleware';

config({ path: resolve(process.cwd(), '.env'), quiet: true });

// Una base aleatoria evita reutilizar DB_DATABASE o la base de otro proceso.
const databaseOriginal = process.env.DB_DATABASE;
const databaseTest = `eventos_inscripcion_${Date.now()}_${process.pid}_${randomBytes(4).toString('hex')}_test`;
const patronBaseTest = /^eventos_inscripcion_\d+_\d+_[a-f0-9]{8}_test$/;
process.env.DB_DATABASE = databaseTest;
process.env.JWT_SECRET = 'inscripcion-eventos-capacitaciones-test-no-usar-en-produccion';

interface RespuestaHttp {
  status: number;
  body: unknown;
  texto: string;
}

interface RespuestaInscripcion {
  ok: true;
  message: string;
  data: {
    id: number;
    usuarioId: number;
    eventoCapacitacionId: number;
    createdAt: string;
    cuposDisponibles: number | null;
  };
}

interface RespuestaReserva {
  ok: true;
  message: string;
  data: {
    id: number;
    usuarioId: number;
    eventoCapacitacionId: number;
    nombreCompleto: string;
    fechaNacimiento: string;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    correo: string;
    telefono: string;
    estado: EstadoReserva;
    createdAt: string;
    updatedAt: string;
    cuposDisponibles: number;
  };
}

let dataSource: DataSource | undefined;
let adminConnection: Connection | undefined;
let baseCreadaPorEsteProceso = false;
let server: Server | undefined;
let baseUrl = '';
let UsuarioModel: typeof import('../models/Usuario').Usuario;
let RolModel: typeof import('../models/Rol').Rol;
let AuditLogModel: typeof AuditLog;
let secuencia = 0;

const variableRequerida = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}`);
  return valor;
};

const exigirNombreAislado = (nombre: unknown): void => {
  assert.ok(patronBaseTest.test(databaseTest) && databaseTest.length <= 64);
  assert.notEqual(databaseTest, databaseOriginal);
  assert.equal(nombre, databaseTest, 'La conexión debe apuntar a la base aislada de esta ejecución');
};

const exigirConexionAislada = async (): Promise<DataSource> => {
  assert.ok(baseCreadaPorEsteProceso, 'La base debe haber sido creada por esta ejecución');
  assert.ok(dataSource?.isInitialized);
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  const bases: Array<{ databaseActual: string }> = await dataSource.query(
    'SELECT DATABASE() AS databaseActual',
  );
  exigirNombreAislado(bases[0]?.databaseActual);
  return dataSource;
};

const comoObjeto = (valor: unknown): Record<string, unknown> => {
  assert.ok(typeof valor === 'object' && valor !== null && !Array.isArray(valor));
  return valor as Record<string, unknown>;
};

const solicitar = async (
  path: string,
  options: RequestInit = {},
): Promise<RespuestaHttp> => {
  const respuesta = await fetch(`${baseUrl}${path}`, options);
  const texto = await respuesta.text();
  const esJson = respuesta.headers.get('content-type')?.includes('application/json') ?? false;

  return {
    status: respuesta.status,
    body: texto.length > 0 && esJson ? JSON.parse(texto) as unknown : undefined,
    texto,
  };
};

const crearToken = (usuarioId: number, rol: NombreRol): string =>
  jwt.sign(
    {
      id: usuarioId,
      nombreUsuario: `inscripcion_${usuarioId}`,
      rol,
    },
    variableRequerida('JWT_SECRET'),
    { expiresIn: '1h' },
  );

const crearUsuario = async (): Promise<Usuario> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const rol = await conexion.getRepository(RolModel).findOneByOrFail({
    nombre: 'visitante',
  });

  return conexion.getRepository(UsuarioModel).save(
    conexion.getRepository(UsuarioModel).create({
      nombreUsuario: `inscripcion_usuario_${secuencia}`,
      nombre: 'Usuario',
      apellidos: `Prueba ${secuencia}`,
      correo: `inscripcion.${secuencia}@test.local`,
      telefono: `8000${String(secuencia).padStart(4, '0')}`,
      contraseña: 'hash-no-utilizado',
      rol,
    }),
  );
};

const crearEvento = async (
  cupoMaximo: number | null,
): Promise<EventosCapacitaciones> => {
  const conexion = await exigirConexionAislada();
  secuencia += 1;
  const evento = new EventosCapacitaciones({
    nombre: `Evento de inscripción ${secuencia}`,
    descripcion: 'Fixture aislado de inscripción.',
    fecha: '2099-12-20',
    hora: '10:30:00',
    lugar: 'Parque Nacional Diriá',
    tipoActividad: TipoActividad.EVENTO,
    cupoMaximo,
    estado: EstadoEventoCapacitacion.PUBLICADO,
    temporada: Temporada.SECA,
  });
  evento.cuposDisponibles = cupoMaximo;
  return conexion.getRepository(EventosCapacitaciones).save(evento);
};

const datosReserva = (cambios: Partial<Record<
  'nombreCompleto' | 'fechaNacimiento' | 'tipoIdentificacion' | 'numeroIdentificacion' | 'correo' | 'telefono',
  string
>> = {}) => ({
  nombreCompleto: 'María Reserva',
  fechaNacimiento: '1990-05-10',
  tipoIdentificacion: 'cedula',
  numeroIdentificacion: '123456789',
  correo: 'reserva@test.local',
  telefono: '+50688887777',
  ...cambios,
});

/* Cobertura retirada: la decisión funcional elimina pre-reservas y expiración automática.
describe('S2: expiración central de pre-reservas pagadas', () => {
  const preparar = async (opciones: { pagada?: boolean; vencida?: boolean; estado?: EstadoReserva } = {}) => {
    const conexion = await exigirConexionAislada(); const usuario = await crearUsuario(); const evento = await crearEvento(2);
    evento.esPago = opciones.pagada ?? true; await conexion.getRepository(EventosCapacitaciones).save(evento);
    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: (respuesta.body as RespuestaReserva).data.id });
    reserva.fechaExpiracionPreReserva = opciones.vencida === false ? new Date(Date.now() + 3600000) : new Date(Date.now() - 3600000);
    if (opciones.estado) reserva.estado = opciones.estado;
    await conexion.getRepository(Reserva).save(reserva); return { conexion, evento, reserva };
  };
  const expirar = async (conexion: DataSource, id: number) => { const m = await import('../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/inscripcion.service'); return conexion.transaction(x => m.expirarReservaPagadaSiCorresponde(x, id)); };
  test('S2-01 expira una pagada vencida, libera un cupo y registra la auditoría del sistema', async () => { const x=await preparar(); assert.equal(await expirar(x.conexion,x.reserva.id),true); assert.equal((await x.conexion.getRepository(Reserva).findOneByOrFail({id:x.reserva.id})).estado,EstadoReserva.EXPIRADA); assert.equal((await x.conexion.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.evento.id})).cuposDisponibles,2); const auditoria=(await obtenerAuditorias('EXPIRAR_RESERVA_EVENTO_CAPACITACION'))[0];assert.ok(auditoria);assert.equal(auditoria.usuarioId,null);assert.deepEqual(JSON.parse(auditoria.details ?? '{}'),{reservaId:x.reserva.id,eventoCapacitacionId:x.evento.id,estado:EstadoReserva.EXPIRADA,origen:'sistema'}); });
  test('S2-02 es idempotente', async () => { const x=await preparar(); assert.equal(await expirar(x.conexion,x.reserva.id),true); assert.equal(await expirar(x.conexion,x.reserva.id),false); assert.equal((await x.conexion.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.evento.id})).cuposDisponibles,2); });
  test('S2-03 no expira aprobada', async () => { const x=await preparar({estado:EstadoReserva.APROBADA}); assert.equal(await expirar(x.conexion,x.reserva.id),false); assert.equal((await x.conexion.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.evento.id})).cuposDisponibles,1); });
  test('S2-04 no expira gratuita', async () => { const x=await preparar({pagada:false}); assert.equal(await expirar(x.conexion,x.reserva.id),false); assert.equal((await x.conexion.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.evento.id})).cuposDisponibles,1); });
  test('S2-05 no expira vigente', async () => { const x=await preparar({vencida:false}); assert.equal(await expirar(x.conexion,x.reserva.id),false); assert.equal((await x.conexion.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.evento.id})).cuposDisponibles,1); });
});

describe('RES-PAGO-EXP: integración de aprobación y comprobantes', () => {
  const prepararPago = async (vencida = false) => { const c=await exigirConexionAislada(), u=await crearUsuario(), a=await crearUsuario(), e=await crearEvento(2); e.esPago=true; await c.getRepository(EventosCapacitaciones).save(e); const rol=await c.getRepository(RolModel).findOneByOrFail({nombre:'administrador'}); a.rol=rol; await c.getRepository(UsuarioModel).save(a); const r=await reservar(e.id,crearToken(u.id,'visitante')); const id=(r.body as RespuestaReserva).data.id; const x=await c.getRepository(Reserva).findOneByOrFail({id}); if(vencida){x.fechaExpiracionPreReserva=new Date(Date.now()-3600000);await c.getRepository(Reserva).save(x)} return {c,u,a,e,id}; };
  test('RES-PAGO-EXP-02 expirada sin comprobante no aprueba ni crea participante', async()=>{const x=await prepararPago(true);const r=await actualizarReservaComoAdmin(x.id,'aprobar',crearToken(x.a.id,'administrador'));assert.equal(r.status,409);assert.equal(comoObjeto(r.body).code,'RESERVATION_EXPIRED');assert.equal((await x.c.getRepository(Reserva).findOneByOrFail({id:x.id})).estado,EstadoReserva.EXPIRADA);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,2);assert.equal(await x.c.getRepository(Participantes).countBy({usuarioId:x.u.id,eventoCapacitacionId:x.e.id}),0);});
  test('RES-PAGO-EXP-03 vigente sin comprobante no cambia cupos', async()=>{const x=await prepararPago();const r=await actualizarReservaComoAdmin(x.id,'aprobar',crearToken(x.a.id,'administrador'));assert.equal(r.status,409);assert.equal(comoObjeto(r.body).code,'PAYMENT_PROOF_REQUIRED');assert.equal((await x.c.getRepository(Reserva).findOneByOrFail({id:x.id})).estado,EstadoReserva.PENDIENTE);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,1);});
  test('RES-PAGO-EXP-04 comprobante válido permite aprobar', async()=>{const x=await prepararPago();const z=await x.c.getRepository(Reserva).findOneByOrFail({id:x.id});z.comprobanteUrl='/uploads/comprobantes/qa-ficticio.txt';await x.c.getRepository(Reserva).save(z);assert.equal((await actualizarReservaComoAdmin(x.id,'aprobar',crearToken(x.a.id,'administrador'))).status,200);assert.equal(await x.c.getRepository(Participantes).countBy({usuarioId:x.u.id,eventoCapacitacionId:x.e.id}),1);});
  test('RES-PAGO-EXP-05 gratuita conserva aprobación', async()=>{const c=await exigirConexionAislada(),u=await crearUsuario(),a=await crearUsuario(),e=await crearEvento(2),rol=await c.getRepository(RolModel).findOneByOrFail({nombre:'administrador'});a.rol=rol;await c.getRepository(UsuarioModel).save(a);const r=await reservar(e.id,crearToken(u.id,'visitante'));assert.equal((await actualizarReservaComoAdmin((r.body as RespuestaReserva).data.id,'aprobar',crearToken(a.id,'administrador'))).status,200);});
  test('RES-PAGO-EXP-08 rechaza comprobante vencido sin archivo huérfano', async()=>{const x=await prepararPago(true);const f=new FormData();f.append('comprobante',new Blob(['ficticio'],{type:'image/png'}),'qa-expirado.png');const r=await fetch(`${baseUrl}/api/reservas/${x.id}/comprobante`,{method:'POST',headers:{Authorization:`Bearer ${crearToken(x.u.id,'visitante')}`},body:f});assert.equal(r.status,409);assert.equal((await x.c.getRepository(Reserva).findOneByOrFail({id:x.id})).estado,EstadoReserva.EXPIRADA);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,2);});
  const ejecutarAuto = async () => (await import('../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/expiracionReservas.service')).expirarPreReservasVencidas();
  test('EXP-AUTO-01 expira vencida y libera un cupo', async()=>{const x=await prepararPago(true);assert.equal(await ejecutarAuto(),1);assert.equal((await x.c.getRepository(Reserva).findOneByOrFail({id:x.id})).estado,EstadoReserva.EXPIRADA);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,2);});
  test('EXP-AUTO-02 ignora vigente, gratuita, comprobante y no pendiente', async()=>{const vigente=await prepararPago(false), gratis=await prepararPago(true), conComp=await prepararPago(true), aprobada=await prepararPago(true);(await gratis.c.getRepository(EventosCapacitaciones).update(gratis.e.id,{esPago:false}));(await conComp.c.getRepository(Reserva).update(conComp.id,{comprobanteUrl:'/uploads/comprobantes/ficticio.png'}));(await aprobada.c.getRepository(Reserva).update(aprobada.id,{estado:EstadoReserva.APROBADA}));assert.equal(await ejecutarAuto(),0);for(const x of [vigente,gratis,conComp,aprobada])assert.equal((await x.c.getRepository(Reserva).findOneByOrFail({id:x.id})).estado,x===aprobada?EstadoReserva.APROBADA:EstadoReserva.PENDIENTE);});
  test('EXP-AUTO-03 es idempotente', async()=>{const x=await prepararPago(true);assert.equal(await ejecutarAuto(),1);assert.equal(await ejecutarAuto(),0);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,2);});
  test('EXP-AUTO-04 revalida estado cambiado', async()=>{const x=await prepararPago(true);await x.c.getRepository(Reserva).update(x.id,{estado:EstadoReserva.CANCELADA});assert.equal(await ejecutarAuto(),0);assert.equal((await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id})).cuposDisponibles,1);});
  test('EXP-AUTO-05 registra un error real por candidata y continúa con la siguiente', async()=>{const malo=await prepararPago(true),bueno=await prepararPago(true),nombreTrigger=`qa_exp_auto_error_${malo.id}`;const errores:unknown[][]=[],errorOriginal=console.error;console.error=(...args:unknown[])=>{errores.push(args)};try{await malo.c.query(`CREATE TRIGGER \`${nombreTrigger}\` BEFORE UPDATE ON reservas FOR EACH ROW BEGIN IF NEW.id = ${malo.id} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo controlado QA EXP-AUTO-05'; END IF; END`);assert.equal(await ejecutarAuto(),1);assert.equal((await malo.c.getRepository(Reserva).findOneByOrFail({id:malo.id})).estado,EstadoReserva.PENDIENTE);assert.equal((await malo.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:malo.e.id})).cuposDisponibles,1);assert.equal((await bueno.c.getRepository(Reserva).findOneByOrFail({id:bueno.id})).estado,EstadoReserva.EXPIRADA);assert.equal((await bueno.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:bueno.e.id})).cuposDisponibles,2);assert.ok(errores.some(args=>args.some(valor=>String(valor).includes(`No se pudo expirar la reserva ${malo.id}`))));}finally{console.error=errorOriginal;await malo.c.query(`DROP TRIGGER IF EXISTS \`${nombreTrigger}\``);}});
  test('EXP-AUTO-06 iniciar repetidamente crea un intervalo y detenerlo lo limpia', async()=>{const servicio=await import('../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/expiracionReservas.service');servicio.detenerExpiracionPreReservas();const setIntervalOriginal=global.setInterval,clearIntervalOriginal=global.clearInterval;let creados=0,limpiados=0;const intervaloFicticio={unref:()=>intervaloFicticio} as unknown as NodeJS.Timeout;(global as typeof globalThis).setInterval=((_fn:()=>void,_ms?:number)=>{creados+=1;return intervaloFicticio}) as typeof setInterval;(global as typeof globalThis).clearInterval=((valor:NodeJS.Timeout)=>{assert.equal(valor,intervaloFicticio);limpiados+=1}) as typeof clearInterval;try{servicio.iniciarExpiracionPreReservas();servicio.iniciarExpiracionPreReservas();assert.equal(creados,1);servicio.detenerExpiracionPreReservas();assert.equal(limpiados,1);servicio.detenerExpiracionPreReservas();assert.equal(limpiados,1);}finally{servicio.detenerExpiracionPreReservas();global.setInterval=setIntervalOriginal;global.clearInterval=clearIntervalOriginal;}});
  test('RES-PAGO-EXP-09 aprobación concurrente con expiración conserva una sola transición', async()=>{const x=await prepararPago(true);const [aprobacion,expiradas]=await Promise.all([actualizarReservaComoAdmin(x.id,'aprobar',crearToken(x.a.id,'administrador')),ejecutarAuto()]);assert.equal(aprobacion.status,409,aprobacion.texto);assert.ok(expiradas===0||expiradas===1);const reserva=await x.c.getRepository(Reserva).findOneByOrFail({id:x.id}),evento=await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id});assert.equal(reserva.estado,EstadoReserva.EXPIRADA);assert.equal(evento.cuposDisponibles,2);assert.equal(await x.c.getRepository(Participantes).countBy({usuarioId:x.u.id,eventoCapacitacionId:x.e.id}),0);});
  test('RES-PAGO-EXP-10 dos usuarios compiten por el cupo liberado sin sobreventa', async()=>{const x=await prepararPago(true);await x.c.getRepository(EventosCapacitaciones).update(x.e.id,{cupoMaximo:1,cuposDisponibles:0});assert.equal(await ejecutarAuto(),1);const u1=await crearUsuario(),u2=await crearUsuario();const respuestas=await Promise.all([reservar(x.e.id,crearToken(u1.id,'visitante')),reservar(x.e.id,crearToken(u2.id,'visitante'))]);assert.equal(respuestas.filter(r=>r.status===201).length,1);assert.equal(respuestas.filter(r=>r.status===409).length,1);const evento=await x.c.getRepository(EventosCapacitaciones).findOneByOrFail({id:x.e.id});const activas=await x.c.getRepository(Reserva).count({where:{eventoCapacitacionId:x.e.id,estado:EstadoReserva.PENDIENTE}});assert.equal(evento.cuposDisponibles,0);assert.ok(evento.cuposDisponibles>=0);assert.equal(activas,1);});
  test('QA-RES-CONC-02 reservas simultáneas no duplican número de ticket', async()=>{const c=await exigirConexionAislada(),u1=await crearUsuario(),u2=await crearUsuario(),e1=await crearEvento(2),e2=await crearEvento(2);const respuestas=await Promise.all([reservar(e1.id,crearToken(u1.id,'visitante')),reservar(e2.id,crearToken(u2.id,'visitante'))]);assert.equal(respuestas.filter(r=>r.status===201).length,2,respuestas.map(r=>`${r.status}:${r.texto}`).join('\n'));const reservas=await c.getRepository(Reserva).findBy([{usuarioId:u1.id,eventoCapacitacionId:e1.id},{usuarioId:u2.id,eventoCapacitacionId:e2.id}]);assert.equal(reservas.length,2);assert.ok(reservas.every(r=>r.estado===EstadoReserva.PENDIENTE));const tickets=reservas.map(r=>r.numeroTicket);assert.ok(tickets.every((ticket):ticket is string=>typeof ticket==='string'&&ticket.length>0));assert.equal(new Set(tickets).size,2);assert.equal(await c.getRepository(Reserva).count({where:{eventoCapacitacionId:e1.id}}),1);assert.equal(await c.getRepository(Reserva).count({where:{eventoCapacitacionId:e2.id}}),1);assert.equal((await c.getRepository(EventosCapacitaciones).findOneByOrFail({id:e1.id})).cuposDisponibles,1);assert.equal((await c.getRepository(EventosCapacitaciones).findOneByOrFail({id:e2.id})).cuposDisponibles,1);assert.equal(await c.getRepository(Participantes).count({where:[{eventoCapacitacionId:e1.id},{eventoCapacitacionId:e2.id}]}),0);});
});

describe('EXP-AUTO-07: coordinación del arranque', () => {
  const crearDependencias = (inicializarBaseDatos: () => Promise<unknown>) => {
    const llamadas: string[] = [];
    return {
      llamadas,
      dependencias: {
        inicializarBaseDatos: async () => { llamadas.push('inicializar'); return inicializarBaseDatos(); },
        iniciarLimpiezaTokensExpirados: () => { llamadas.push('limpieza-tokens'); },
        iniciarLimpiezaTokensBlacklist: () => { llamadas.push('limpieza-blacklist'); },
        iniciarLimpiezaIncidencias: () => { llamadas.push('limpieza-incidencias'); },
        iniciarExpiracionPreReservas: () => { llamadas.push('expiracion'); },
        iniciarServidor: () => { llamadas.push('servidor'); },
      },
    };
  };

  test('EXP-AUTO-07a no inicia servidor ni expiración antes de completar la inicialización', async () => {
    let completarInicializacion: (() => void) | undefined;
    const inicioPendiente = new Promise<void>((resolve) => { completarInicializacion = resolve; });
    const x = crearDependencias(() => inicioPendiente);
    const { crearCoordinadorArranque } = await import('../coordinadorArranque.service');
    const inicio = crearCoordinadorArranque(x.dependencias).iniciar();
    assert.deepEqual(x.llamadas, ['inicializar']);
    completarInicializacion?.();
    await inicio;
    assert.deepEqual(x.llamadas, ['inicializar', 'limpieza-tokens', 'limpieza-blacklist', 'limpieza-incidencias', 'expiracion', 'servidor']);
  });

  test('EXP-AUTO-07b no inicia servidor ni expiración si falla la inicialización', async () => {
    const x = crearDependencias(async () => { throw new Error('fallo controlado de inicialización'); });
    const { crearCoordinadorArranque } = await import('../coordinadorArranque.service');
    await assert.rejects(crearCoordinadorArranque(x.dependencias).iniciar(), /fallo controlado de inicialización/);
    assert.deepEqual(x.llamadas, ['inicializar']);
  });

  test('EXP-AUTO-07c coalesca solicitudes repetidas de arranque', async () => {
    let inicializaciones = 0;
    const x = crearDependencias(async () => { inicializaciones += 1; });
    const { crearCoordinadorArranque } = await import('../coordinadorArranque.service');
    const coordinador = crearCoordinadorArranque(x.dependencias);
    await Promise.all([coordinador.iniciar(), coordinador.iniciar(), coordinador.iniciar()]);
    assert.equal(inicializaciones, 1);
    assert.equal(x.llamadas.filter((llamada) => llamada === 'expiracion').length, 1);
    assert.equal(x.llamadas.filter((llamada) => llamada === 'servidor').length, 1);
  });
});

*/

const inscribir = async (
  eventoId: number | string,
  token?: string,
): Promise<RespuestaHttp> => solicitar(
  `/api/eventos-capacitaciones/${encodeURIComponent(String(eventoId))}/inscripcion`,
  {
    method: 'POST',
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  },
);

const reservar = async (
  eventoId: number | string,
  token: string | undefined,
  datos = datosReserva(),
): Promise<RespuestaHttp> => solicitar(
  `/api/eventos-capacitaciones/${encodeURIComponent(String(eventoId))}/reserva`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(datos),
  },
);

const reservarConComprobante = async (
  eventoId: number,
  token: string,
  datos = datosReserva(),
): Promise<RespuestaHttp> => {
  const cuerpo = new FormData();
  Object.entries(datos).forEach(([campo, valor]) => cuerpo.append(campo, valor));
  cuerpo.append('comprobante', new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }), 'qa-comprobante.png');
  return solicitar(`/api/eventos-capacitaciones/${eventoId}/reserva`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: cuerpo,
  });
};

const actualizarReservaComoAdmin = async (
  reservaId: number,
  estado: 'aprobar' | 'rechazar',
  token: string,
): Promise<RespuestaHttp> => {
  const options: RequestInit = {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  if (estado === 'rechazar') {
    options.body = JSON.stringify({
      motivoRechazo: 'No cumple los requisitos de la actividad.',
    });
  }

  return solicitar(`/api/admin/inscripciones/${reservaId}/${estado}`, options);
};

const cancelarReserva = async (
  reservaId: number,
  token: string,
  datosDevolucion?: { tipo: 'sinpe_movil'; telefono: string } | { tipo: 'transferencia_bancaria'; iban: string; banco: string },
): Promise<RespuestaHttp> => solicitar(`/api/reservas/${reservaId}/cancelar`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, ...(datosDevolucion ? { 'Content-Type': 'application/json' } : {}) },
  ...(datosDevolucion ? { body: JSON.stringify({ datosDevolucion }) } : {}),
});

const cancelarInscripcionHttp = async (
  inscripcionId: number,
  token: string,
): Promise<RespuestaHttp> => solicitar(`/api/inscripciones/${inscripcionId}/cancelar`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

const consultarInscripcionesAdmin = async (
  token?: string,
): Promise<RespuestaHttp> => solicitar('/api/admin/inscripciones', {
  method: 'GET',
  ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
});

const registrarDevolucionProcesadaHttp = async (
  reservaId: number,
  token: string,
  referencia: string,
): Promise<RespuestaHttp> => solicitar(
  `/api/admin/inscripciones/${reservaId}/devolucion-procesada`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ referencia }),
  },
);

const obtenerDetalle = async (eventoId: number): Promise<Record<string, unknown>> => {
  const respuesta = await solicitar(`/api/eventos/${eventoId}`);
  assert.equal(respuesta.status, 200, respuesta.texto);
  const body = comoObjeto(respuesta.body);
  assert.equal(body.ok, true);
  return comoObjeto(body.data);
};

const obtenerAuditorias = async (action: string): Promise<AuditLog[]> =>
  (await exigirConexionAislada()).getRepository(AuditLogModel).find({
    where: { action },
    order: { id: 'ASC' },
  });

const limpiarBaseTest = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.query('DELETE FROM audit_logs');
  await conexion.query('DELETE FROM reservas');
  await conexion.query('DELETE FROM participantes');
  await conexion.query('DELETE FROM eventos_capacitaciones');
  await conexion.query('DELETE FROM usuarios');
  await conexion.query('DELETE FROM roles');
  secuencia = 0;
};

const inicializarRoles = async (): Promise<void> => {
  const conexion = await exigirConexionAislada();
  await conexion.getRepository(RolModel).save([
    { nombre: 'administrador', descripcion: 'Administrador de prueba' },
    { nombre: 'asociado', descripcion: 'Asociado de prueba' },
    { nombre: 'visitante', descripcion: 'Visitante de prueba' },
  ] as Rol[]);
};

before(async () => {
  exigirNombreAislado(process.env.DB_DATABASE);
  adminConnection = await mysql.createConnection({
    host: variableRequerida('DB_HOST'),
    port: Number(variableRequerida('DB_PORT')),
    user: variableRequerida('DB_USERNAME'),
    password: variableRequerida('DB_PASSWORD'),
  });
  await adminConnection.query(`CREATE DATABASE \`${databaseTest}\``);
  baseCreadaPorEsteProceso = true;

  // AppDataSource captura DB_DATABASE al importarse; se carga después del cambio.
  const dataSourceModule = await import('../data-source');
  const usuarioModule = await import('../models/Usuario');
  const rolModule = await import('../models/Rol');
  const auditLogModule = await import('../models/AuditLog');
  const rutasInscripcion = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Crear Eventos y Capacitaciones/eventosCapacitaciones.routes'
  );
  const rutasPublicas = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Visualización de Eventos y Capacitaciones/eventos.routes'
  );
  const rutasAdminInscripciones = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/inscripcionesAdmin.route'
  );
  const rutasMisInscripciones = await import(
    '../modulos/Gestión de Eventos y Capacitaciones/Inscripción a Eventos y Capacitaciones/Ver mis Inscripciones/inscripciones.routes'
  );

  dataSource = dataSourceModule.AppDataSource;
  UsuarioModel = usuarioModule.Usuario;
  RolModel = rolModule.Rol;
  AuditLogModel = auditLogModule.AuditLog;
  exigirNombreAislado((dataSource.options as { database?: string }).database);
  assert.equal(dataSource.options.synchronize, false);
  await dataSource.initialize();
  await exigirConexionAislada();
  await dataSource.runMigrations();

  const app = express();
  app.use(express.json());
  app.use('/uploads', (req, res, next) => req.path.startsWith('/comprobantes/') ? res.status(404).end() : next(), express.static(resolve(process.cwd(), 'uploads')));
  app.use('/api/eventos-capacitaciones', rutasInscripcion.default);
  app.use('/api/eventos', rutasPublicas.default);
  app.use('/api/admin', rutasAdminInscripciones.default);
  app.use('/api/inscripciones', rutasMisInscripciones.default);
  app.use('/api/reservas', rutasMisInscripciones.reservasRouter);
  app.use(errorMiddleware);
  await new Promise<void>((resolveListen, rejectListen) => {
    server = app.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });
  assert.ok(server);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

describe('RES-COMP-01 a RES-COMP-07: acceso protegido a comprobantes', () => {
  const preparar = async () => { const u=await crearUsuario(), o=await crearUsuario(), e=await crearEvento(2); const r=await reservar(e.id,crearToken(u.id,'visitante')); const id=(r.body as RespuestaReserva).data.id; const f=`qa-comp-${id}.txt`, d=resolve(process.cwd(),'uploads','comprobantes'); await mkdir(d,{recursive:true}); await writeFile(resolve(d,f),'comprobante-ficticio'); const x=await exigirConexionAislada(); const reserva=await x.getRepository(Reserva).findOneByOrFail({id}); reserva.comprobanteUrl=`/uploads/comprobantes/${f}`; await x.getRepository(Reserva).save(reserva); return {u,o,id,f,d}; };
  test('RES-COMP-01, 02, 03, 05 y 06', async () => { const x=await preparar(); try { assert.equal((await solicitar(`/api/reservas/${x.id}/comprobante`)).status,401); assert.equal((await fetch(`${baseUrl}/api/reservas/${x.id}/comprobante`,{headers:{Authorization:`Bearer ${crearToken(x.u.id,'visitante')}`}})).status,200); assert.equal((await solicitar(`/api/reservas/${x.id}/comprobante`,{headers:{Authorization:`Bearer ${crearToken(x.o.id,'visitante')}`}})).status,404); assert.equal((await solicitar('/api/reservas/999999/comprobante',{headers:{Authorization:`Bearer ${crearToken(x.u.id,'visitante')}`}})).status,404); assert.equal((await solicitar('/api/reservas/../comprobante',{headers:{Authorization:`Bearer ${crearToken(x.u.id,'visitante')}`}})).status,404); } finally { await unlink(resolve(x.d,x.f)); } });
  test('RES-COMP-04 y 07', async () => { const x=await preparar(); try { const c=await exigirConexionAislada(); const rol=await c.getRepository(RolModel).findOneByOrFail({nombre:'administrador'}); const a=await crearUsuario(); a.rol=rol; await c.getRepository(UsuarioModel).save(a); assert.equal((await fetch(`${baseUrl}/api/reservas/${x.id}/comprobante`,{headers:{Authorization:`Bearer ${crearToken(a.id,'administrador')}`}})).status,200); assert.equal((await fetch(`${baseUrl}/uploads/comprobantes/${x.f}`)).status,404); } finally { await unlink(resolve(x.d,x.f)); } });
});

describe('Creación de reservas pagadas sin pre-reserva', () => {
  const prepararActividadPagada = async () => {
    const conexion = await exigirConexionAislada();
    const evento = await crearEvento(2);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    await conexion.getRepository(EventosCapacitaciones).save(evento);
    return { conexion, evento };
  };

  test('RES-PAGO-CREAR-01 crea una reserva pagada con comprobante en una sola solicitud', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const respuesta = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 201, respuesta.texto);
    const id = (respuesta.body as RespuestaReserva).data.id;
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id });
    const actividad = await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
    const comprobante = await conexion.getRepository(ComprobantePago).findOneByOrFail({ reservaId: reserva.id });
    assert.equal(comprobante.storageProvider, 'mysql');
    assert.ok(comprobante.contenido);
    assert.equal(comprobante.sha256.length, 64);
    assert.equal(reserva.fechaExpiracionPreReserva, null);
    assert.equal(actividad.cuposDisponibles, 1);
  });

  test('RES-PAGO-CREAR-02 rechaza una creación pagada sin comprobante sin crear reserva ni retener cupo', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'PAYMENT_PROOF_REQUIRED');
    assert.equal(await conexion.getRepository(Reserva).countBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id }), 0);
    assert.equal((await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 2);
  });

  test('RES-PAGO-CREAR-03 mantiene la reserva gratuita sin comprobante', async () => {
    const conexion = await exigirConexionAislada();
    const evento = await crearEvento(2);
    const usuario = await crearUsuario();
    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 201, respuesta.texto);
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: (respuesta.body as RespuestaReserva).data.id });
    assert.equal(reserva.comprobanteUrl, null);
    assert.equal(reserva.fechaExpiracionPreReserva, null);
  });

  test('RES-PAGO-APROB-01 impide aprobar una reserva pagada sin comprobante', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const administrador = await crearUsuario();
    const rol = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    administrador.rol = rol;
    await conexion.getRepository(UsuarioModel).save(administrador);
    const reserva = await conexion.getRepository(Reserva).save(conexion.getRepository(Reserva).create({
      usuarioId: usuario.id, eventoCapacitacionId: evento.id, ...datosReserva(), estado: EstadoReserva.PENDIENTE,
      numeroTicket: `#QA-${usuario.id}`, metodoPago: 'sinpe_movil', comprobanteUrl: null,
    }));
    await conexion.getRepository(EventosCapacitaciones).update(evento.id, { cuposDisponibles: 1 });
    const respuesta = await actualizarReservaComoAdmin(reserva.id, 'aprobar', crearToken(administrador.id, 'administrador'));
    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'PAYMENT_PROOF_REQUIRED');
    assert.equal((await conexion.getRepository(Reserva).findOneByOrFail({ id: reserva.id })).estado, EstadoReserva.PENDIENTE);
    assert.equal(await conexion.getRepository(Participantes).countBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id }), 0);
    assert.equal((await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 1);
  });

  test('RES-PAGO-APROB-02 permite aprobar una reserva pagada con comprobante', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const administrador = await crearUsuario();
    const rol = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    administrador.rol = rol;
    await conexion.getRepository(UsuarioModel).save(administrador);
    const creada = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(creada.status, 201, creada.texto);
    const id = (creada.body as RespuestaReserva).data.id;
    const respuesta = await actualizarReservaComoAdmin(id, 'aprobar', crearToken(administrador.id, 'administrador'));
    assert.equal(respuesta.status, 200, respuesta.texto);
    assert.equal((await conexion.getRepository(Reserva).findOneByOrFail({ id })).estado, EstadoReserva.APROBADA);
    assert.equal(await conexion.getRepository(Participantes).countBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id }), 1);
    const comprobante = (await conexion.getRepository(Reserva).findOneByOrFail({ id })).comprobanteUrl;
    if (comprobante) await unlink(resolve(process.cwd(), comprobante.replace(/^\/uploads\//, 'uploads/')));
  });

  test('reserva pagada aprobada conserva esPago y origen reserva al listar mis inscripciones', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const administrador = await crearUsuario();
    const rol = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    administrador.rol = rol;
    await conexion.getRepository(UsuarioModel).save(administrador);
    const creada = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    const id = (creada.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(id, 'aprobar', crearToken(administrador.id, 'administrador'))).status, 200);
    const respuesta = await solicitar('/api/inscripciones/mias', { headers: { Authorization: `Bearer ${crearToken(usuario.id, 'visitante')}` } });
    assert.equal(respuesta.status, 200, respuesta.texto);
    const lista = (comoObjeto(respuesta.body).data as Array<Record<string, unknown>>);
    const reserva = lista.find((item) => item.id === id);
    assert.equal(reserva?.origen, 'reserva');
    assert.equal(reserva?.esPago, true);
    const comprobante = (await conexion.getRepository(Reserva).findOneByOrFail({ id })).comprobanteUrl;
    if (comprobante) await unlink(resolve(process.cwd(), comprobante.replace(/^\/uploads\//, 'uploads/')));
  });

  test('STORAGE-01 revierte reserva y cupo si falla persistencia MySQL', async () => {
  const { conexion, evento } = await prepararActividadPagada();
  const usuario = await crearUsuario();
  const nombreTrigger = 'qa_fallar_comprobante_storage01';

  await conexion.query(
    `DROP TRIGGER IF EXISTS \`${nombreTrigger}\``,
  );

  try {
    await conexion.query(`
      CREATE TRIGGER \`${nombreTrigger}\`
      BEFORE INSERT ON comprobantes_pago
      FOR EACH ROW
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Fallo QA intencional'
    `);

    const respuesta = await reservarConComprobante(
      evento.id,
      crearToken(usuario.id, 'visitante'),
    );

    assert.equal(respuesta.status, 500, respuesta.texto);

    assert.equal(
      await conexion.getRepository(Reserva).countBy({
        usuarioId: usuario.id,
        eventoCapacitacionId: evento.id,
      }),
      0,
    );

    const actividad =
      await conexion.getRepository(EventosCapacitaciones)
        .findOneByOrFail({ id: evento.id });

    assert.equal(actividad.cuposDisponibles, 2);
  } finally {
    await conexion.query(
      `DROP TRIGGER IF EXISTS \`${nombreTrigger}\``,
    );
  }
});

  test('STORAGE-02 reemplaza comprobante y conserva el binario MySQL', async () => {
    const { conexion, evento } = await prepararActividadPagada();
    const usuario = await crearUsuario();
    const eliminados: string[] = [];
    let secuenciaStorage = 0;
    const storage: StorageService = {
      put: async (buffer) => ({ key: `payment-proofs/test-${++secuenciaStorage}`, provider: 'mock', sizeBytes: buffer.length, sha256: 'a'.repeat(64) }),
      get: async () => { throw new Error('No utilizado'); },
      delete: async (key) => { eliminados.push(key); },
    };
    establecerStoragePrivadoParaPruebas(storage);
    try {
      const creada = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
      assert.equal(creada.status, 201, creada.texto);
      const reservaId = (creada.body as RespuestaReserva).data.id;
      const formulario = new FormData();
      formulario.append('comprobante', new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }), 'reemplazo.png');
      const reemplazo = await solicitar(`/api/reservas/${reservaId}/comprobante`, { method: 'POST', headers: { Authorization: `Bearer ${crearToken(usuario.id, 'visitante')}` }, body: formulario });
      assert.equal(reemplazo.status, 200, reemplazo.texto);
      const comprobante = await conexion.getRepository(ComprobantePago).findOneByOrFail({ reservaId });
     assert.equal(comprobante.storageKey, null);
     assert.deepEqual(eliminados, []);
    } finally {
      establecerStoragePrivadoParaPruebas();
    }
  });
});

beforeEach(async () => {
  await limpiarBaseTest();
  await inicializarRoles();
});

after(async () => {
  try {
    if (server) {
      await new Promise<void>((resolveClose, rejectClose) => {
        server?.close((error) => error ? rejectClose(error) : resolveClose());
      });
    }
    if (dataSource?.isInitialized) {
      await exigirConexionAislada();
      await dataSource.destroy();
    }
    if (baseCreadaPorEsteProceso && adminConnection) {
      exigirNombreAislado(databaseTest);
      await adminConnection.query(`DROP DATABASE \`${databaseTest}\``);
      baseCreadaPorEsteProceso = false;
    }
  } finally {
    await adminConnection?.end();
    if (databaseOriginal === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = databaseOriginal;
  }
});

describe('GET /api/admin/inscripciones', () => {
  test('permite consultar inscripciones a un administrador y devuelve usuarios y actividades relacionadas', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(5);
    const admin = await crearUsuario();
    await (await exigirConexionAislada()).getRepository(UsuarioModel).update(admin.id, { rol: await (await exigirConexionAislada()).getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' }) });

    const respuestaInscripcion = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuestaInscripcion.status, 201, respuestaInscripcion.texto);

    const respuesta = await consultarInscripcionesAdmin(crearToken(admin.id, 'administrador'));

    assert.equal(respuesta.status, 200, respuesta.texto);
    const body = comoObjeto(respuesta.body);
    assert.equal(body.ok, true);
    assert.equal(body.message, 'Inscripciones consultadas correctamente.');
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 1);

    const registro = comoObjeto(body.data[0]);
    assert.equal(registro.id, (respuestaInscripcion.body as RespuestaInscripcion).data.id);
    assert.equal(registro.usuarioId, usuario.id);
    assert.equal(registro.nombreUsuario, usuario.nombreUsuario);
    assert.equal(registro.correo, usuario.correo);
    assert.equal(registro.nombreCompleto, `${usuario.nombre} ${usuario.apellidos}`);
    assert.equal(registro.eventoCapacitacionId, evento.id);
    assert.equal(registro.nombreActividad, evento.nombre);
    assert.equal(registro.tipoActividad, evento.tipoActividad);
    assert.equal(registro.fechaActividad, evento.fecha);
    assert.ok(typeof registro.fechaInscripcion === 'string');
  });

  test('rechaza la consulta para un usuario sin rol de administrador', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(5);
    await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    const respuesta = await consultarInscripcionesAdmin(crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 403, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      message: 'No tiene permisos para realizar esta operación',
    });
  });
});

describe('POST /api/eventos-capacitaciones/:id/inscripcion', () => {
  test('inscribe un usuario autenticado y registra el participante', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);

    const respuesta = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 201, respuesta.texto);
    const body = respuesta.body as RespuestaInscripcion;
    assert.equal(body.ok, true);
    assert.equal(body.message, 'Inscripción realizada correctamente.');
    assert.equal(body.data.usuarioId, usuario.id);
    assert.equal(body.data.eventoCapacitacionId, evento.id);
    assert.equal(body.data.cuposDisponibles, 2);
    assert.equal(typeof body.data.createdAt, 'string');

    const participante = await (await exigirConexionAislada())
      .getRepository(Participantes)
      .findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.notEqual(participante, null);
    assert.equal(participante?.id, body.data.id);
  });

  test('registra auditoría de inscripción sin duplicar eventos en operaciones fallidas', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await inscribir(evento.id, token)).status, 201);
    assert.equal((await inscribir(evento.id, token)).status, 409);

    const auditorias = await obtenerAuditorias('CREAR_INSCRIPCION_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.eventoCapacitacionId, evento.id);
    assert.equal(detalles.estado, EstadoParticipante.CONFIRMADA);
  });

  test('registra auditoría al cancelar una inscripción', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');
    const respuestaInscripcion = await inscribir(evento.id, token);
    const inscripcionId = (respuestaInscripcion.body as RespuestaInscripcion).data.id;

    const respuesta = await cancelarInscripcionHttp(inscripcionId, token);

    assert.equal(respuesta.status, 200, respuesta.texto);
    const auditorias = await obtenerAuditorias('CANCELAR_INSCRIPCION_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.participanteId, inscripcionId);
    assert.equal(detalles.estadoAnterior, EstadoParticipante.CONFIRMADA);
    assert.equal(detalles.estadoNuevo, EstadoParticipante.CANCELADA);
  });

  test('rechaza una inscripción duplicada con 409 y conserva un solo registro', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await inscribir(evento.id, token)).status, 201);
    const respuesta = await inscribir(evento.id, token);

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'ALREADY_REGISTERED',
      message: 'El usuario ya está inscrito en este evento o capacitación.',
    });
    const cantidad = await (await exigirConexionAislada())
      .getRepository(Participantes)
      .count({ where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id } });
    assert.equal(cantidad, 1);
  });

  test('devuelve 404 y EVENT_NOT_FOUND para un evento inexistente', async () => {
    const usuario = await crearUsuario();
    const respuesta = await inscribir(2147483647, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 404, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'EVENT_NOT_FOUND',
      message: 'El evento o capacitación no existe.',
    });
  });

  test('sin token devuelve 401', async () => {
    const evento = await crearEvento(3);
    const respuesta = await inscribir(evento.id);

    assert.equal(respuesta.status, 401, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'TOKEN_NOT_PROVIDED',
      message: 'Se requiere inicio de sesión',
    });
  });

  test('rechaza IDs inválidos con 400 e INVALID_EVENT_ID', async () => {
    const usuario = await crearUsuario();
    const respuesta = await inscribir('abc', crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 400, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'INVALID_EVENT_ID',
      message: 'El id debe ser un número entero positivo.',
    });
  });

  test('rechaza una inscripción cuando ya no hay cupos', async () => {
    const usuarioInscrito = await crearUsuario();
    const usuarioSinCupo = await crearUsuario();
    const evento = await crearEvento(1);
    const conexion = await exigirConexionAislada();
    await conexion.getRepository(Participantes).save({
      usuarioId: usuarioInscrito.id,
      eventoCapacitacionId: evento.id,
      numeroTicket: '#TKT-99999999',
    });
    await conexion.getRepository(EventosCapacitaciones).update(evento.id, {
      cuposDisponibles: null,
    });

    const respuesta = await inscribir(evento.id, crearToken(usuarioSinCupo.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'NO_AVAILABLE_SLOTS',
      message: 'No hay cupos disponibles para este evento o capacitación.',
    });
    assert.equal(
      await conexion.getRepository(Participantes).count({ where: { eventoCapacitacionId: evento.id } }),
      1,
    );
  });

  test('actualiza la disponibilidad real en detalle público después de cada inscripción', async () => {
    const primerUsuario = await crearUsuario();
    const segundoUsuario = await crearUsuario();
    const evento = await crearEvento(3);

    const primera = await inscribir(evento.id, crearToken(primerUsuario.id, 'visitante'));
    assert.equal(primera.status, 201, primera.texto);
    assert.equal((primera.body as RespuestaInscripcion).data.cuposDisponibles, 2);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, 2);

    const segunda = await inscribir(evento.id, crearToken(segundoUsuario.id, 'visitante'));
    assert.equal(segunda.status, 201, segunda.texto);
    assert.equal((segunda.body as RespuestaInscripcion).data.cuposDisponibles, 1);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, 1);
  });

  test('mantiene cuposDisponibles en null cuando el evento no define cupo máximo', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(null);

    const respuesta = await inscribir(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 201, respuesta.texto);
    assert.equal((respuesta.body as RespuestaInscripcion).data.cuposDisponibles, null);
    assert.equal((await obtenerDetalle(evento.id)).cuposDisponibles, null);
  });
});

describe('POST /api/eventos-capacitaciones/:id/reserva', () => {
  test('registra auditoría de reserva y no registra éxito si la operación falla', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(1);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    const sinCupo = await reservar(evento.id, crearToken((await crearUsuario()).id, 'visitante'));
    assert.equal(sinCupo.status, 409, sinCupo.texto);

    const auditorias = await obtenerAuditorias('CREAR_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.eventoCapacitacionId, evento.id);
    assert.equal(detalles.estado, EstadoReserva.PENDIENTE);
  });

  test('revierte la reserva y cupos si falla la auditoría obligatoria', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(1);
    const conexion = await exigirConexionAislada();
    const nombreTrigger = `audit_reserva_bloqueo_${Date.now()}`;
    await conexion.query(`
      CREATE TRIGGER \`${nombreTrigger}\`
      BEFORE INSERT ON \`audit_logs\`
      FOR EACH ROW
      BEGIN
        IF NEW.action = 'CREAR_RESERVA_EVENTO_CAPACITACION' THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba en auditoría';
        END IF;
      END
    `);

    try {
      const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

      assert.equal(respuesta.status, 500, respuesta.texto);
      assert.equal(await conexion.getRepository(Reserva).count(), 0);
      const eventoActualizado = await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
      assert.equal(eventoActualizado.cuposDisponibles, 1);
    } finally {
      await conexion.query(`DROP TRIGGER \`${nombreTrigger}\``);
    }
  });

  test('crea una reserva pendiente y persiste los datos personales', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const datos = datosReserva();

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'), datos);

    assert.equal(respuesta.status, 201, respuesta.texto);
    const body = respuesta.body as RespuestaReserva;
    assert.equal(body.ok, true);
    assert.equal(body.data.usuarioId, usuario.id);
    assert.equal(body.data.eventoCapacitacionId, evento.id);
    assert.equal(body.data.estado, EstadoReserva.PENDIENTE);
    assert.equal(body.data.cuposDisponibles, 2);

    const reserva = await (await exigirConexionAislada())
      .getRepository(Reserva)
      .findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.ok(reserva);
    assert.equal(reserva.nombreCompleto, datos.nombreCompleto);
    assert.equal(reserva.fechaNacimiento, datos.fechaNacimiento);
    assert.equal(reserva.tipoIdentificacion, datos.tipoIdentificacion);
    assert.equal(reserva.numeroIdentificacion, datos.numeroIdentificacion);
    assert.equal(reserva.correo, datos.correo);
    assert.equal(reserva.telefono, datos.telefono);
    assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
  });

  test('rechaza una segunda reserva pendiente', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    const respuesta = await reservar(evento.id, token);

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.deepEqual(respuesta.body, {
      ok: false,
      code: 'RESERVATION_ALREADY_EXISTS',
      message: 'El usuario ya tiene una reserva activa para este evento.',
    });
    assert.equal(
      (await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles,
      2,
    );
  });

  test('rechaza una segunda reserva aprobada', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await reservar(evento.id, token)).status, 201);
    await (await exigirConexionAislada()).getRepository(Reserva).update(
      { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
      { estado: EstadoReserva.APROBADA },
    );

    const respuesta = await reservar(evento.id, token);
    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'RESERVATION_ALREADY_EXISTS');
    assert.equal(
      (await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles,
      2,
    );
  });

  for (const estado of [EstadoReserva.CANCELADA, EstadoReserva.RECHAZADA]) {
    test(`reutiliza una reserva ${estado} y actualiza sus datos`, async () => {
      const usuario = await crearUsuario();
      const evento = await crearEvento(3);
      const token = crearToken(usuario.id, 'visitante');

      const primera = await reservar(evento.id, token);
      assert.equal(primera.status, 201, primera.texto);
      const primeraId = (primera.body as RespuestaReserva).data.id;
      await (await exigirConexionAislada()).getRepository(Reserva).update(
        { id: primeraId },
        { estado },
      );

      const nuevosDatos = datosReserva({
        nombreCompleto: 'Persona Actualizada',
        numeroIdentificacion: '987654321',
        correo: 'actualizada@test.local',
      });
      const segunda = await reservar(evento.id, token, nuevosDatos);

      assert.equal(segunda.status, 201, segunda.texto);
      const reserva = await (await exigirConexionAislada())
        .getRepository(Reserva)
        .findOneByOrFail({ id: primeraId });
      assert.equal(reserva.id, primeraId);
      assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
      assert.equal(reserva.nombreCompleto, nuevosDatos.nombreCompleto);
      assert.equal(reserva.numeroIdentificacion, nuevosDatos.numeroIdentificacion);
      assert.equal(reserva.correo, nuevosDatos.correo);
      assert.equal((segunda.body as RespuestaReserva).data.cuposDisponibles, 1);
    });
  }

  test('rechaza la reserva cuando no hay cupos', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(0);

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'NO_AVAILABLE_SLOTS');
  });

  test('rechaza un evento no publicado', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { estado: EstadoEventoCapacitacion.BORRADOR },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'EVENT_NOT_PUBLISHED');
  });

  test('rechaza un evento con fecha vencida', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { fecha: '2000-01-01' },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 409, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'EVENT_DATE_PASSED');
  });

  test('rechaza una edad fuera de las restricciones del evento', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).update(
      evento.id,
      { edadMinima: 40 },
    );

    const respuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));

    assert.equal(respuesta.status, 400, respuesta.texto);
    assert.equal(comoObjeto(respuesta.body).code, 'AGE_NOT_ALLOWED');
  });
});

describe('PATCH /api/admin/inscripciones/:id/{aprobar|rechazar}', () => {
  const crearAdministrador = async () => {
    const admin = await crearUsuario();
    const conexion = await exigirConexionAislada();
    const rolAdministrador = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(admin.id, { rol: rolAdministrador });
    return admin;
  };

  test('pendiente a rechazada incrementa el cupo una vez', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'rechazar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.RECHAZADA);
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });

  test('pendiente a aprobada conserva el cupo descontado', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'aprobar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    const participante = await (await exigirConexionAislada()).getRepository(Participantes).findOneBy({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    assert.equal(reserva.estado, EstadoReserva.APROBADA);
    assert.equal(eventoActualizado.cuposDisponibles, 2);
    assert.ok(participante);
    assert.equal(participante?.estado, 'confirmada');

    const auditorias = await obtenerAuditorias('CAMBIAR_ESTADO_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, admin.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.reservaId, reservaId);
    assert.equal(detalles.estadoAnterior, EstadoReserva.PENDIENTE);
    assert.equal(detalles.estadoNuevo, EstadoReserva.APROBADA);
  });

  test('no crea un Participante duplicado al aprobar', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const conexion = await exigirConexionAislada();
    const participanteInicial = await conexion.getRepository(Participantes).save({
      usuarioId: usuario.id,
      eventoCapacitacionId: evento.id,
      estado: EstadoParticipante.PENDIENTE,
      numeroTicket: '#TKT-99989999',
    });
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;

    const respuesta = await actualizarReservaComoAdmin(
      reservaId,
      'aprobar',
      crearToken(admin.id, 'administrador'),
    );

    assert.equal(respuesta.status, 200, respuesta.texto);
    const participantes = await conexion.getRepository(Participantes).find({
      where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
    });
    assert.equal(participantes.length, 1);
    assert.equal(participantes[0]?.id, participanteInicial.id);
    assert.equal(participantes[0]?.estado, 'confirmada');
  });

  test('revierte la aprobación y el Participante si falla el guardado de la Reserva', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;
    const conexion = await exigirConexionAislada();
    const nombreTrigger = `reservas_bloqueo_${Date.now()}`;

    await conexion.query(`
      CREATE TRIGGER \`${nombreTrigger}\`
      BEFORE UPDATE ON \`reservas\`
      FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba al aprobar reserva'
    `);

    try {
      const respuesta = await actualizarReservaComoAdmin(
        reservaId,
        'aprobar',
        crearToken(admin.id, 'administrador'),
      );

      assert.equal(respuesta.status, 500, respuesta.texto);
      const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
      const participantes = await conexion.getRepository(Participantes).find({
        where: { usuarioId: usuario.id, eventoCapacitacionId: evento.id },
      });
      assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
      assert.equal(participantes.length, 0);
    } finally {
      await conexion.query(`DROP TRIGGER \`${nombreTrigger}\``);
    }
  });

  test('rechazada a rechazada no vuelve a liberar cupo', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const reservaRespuesta = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (reservaRespuesta.body as RespuestaReserva).data.id;
    const tokenAdmin = crearToken(admin.id, 'administrador');

    assert.equal((await actualizarReservaComoAdmin(reservaId, 'rechazar', tokenAdmin)).status, 200);
    const segundaRespuesta = await actualizarReservaComoAdmin(reservaId, 'rechazar', tokenAdmin);

    assert.equal(segundaRespuesta.status, 409, segundaRespuesta.texto);
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });
});

describe('PATCH /api/reservas/:id/cancelar', () => {
  const crearAdministrador = async () => {
    const admin = await crearUsuario();
    const conexion = await exigirConexionAislada();
    const rolAdministrador = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(admin.id, { rol: rolAdministrador });
    return admin;
  };

  test('cancela una reserva pendiente y libera un cupo', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 200, respuesta.texto);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const eventoActualizado = await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    assert.equal(eventoActualizado.cuposDisponibles, 3);

    const auditorias = await obtenerAuditorias('CANCELAR_RESERVA_EVENTO_CAPACITACION');
    assert.equal(auditorias.length, 1);
    assert.equal(auditorias[0]?.usuarioId, usuario.id);
    const detalles = JSON.parse(auditorias[0]?.details ?? '{}') as Record<string, unknown>;
    assert.equal(detalles.reservaId, reservaId);
    assert.equal(detalles.estadoAnterior, EstadoReserva.PENDIENTE);
    assert.equal(detalles.estadoNuevo, EstadoReserva.CANCELADA);
  });

  test('cancela una reserva pagada con más de 48 horas y datos de devolución', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).save(evento);
    const respuestaReserva = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuestaReserva.status, 201, respuestaReserva.texto);
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'), { tipo: 'sinpe_movil', telefono: '88887777' });
    assert.equal(respuesta.status, 200, respuesta.texto);
    const conexion = await exigirConexionAislada();
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    assert.deepEqual(reserva.datosDevolucion, { tipo: 'sinpe_movil', telefono: '88887777' });
    assert.equal((await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 3);
    if (reserva.comprobanteUrl) await unlink(resolve(process.cwd(), reserva.comprobanteUrl.replace(/^\/uploads\//, 'uploads/')));
  });

  test('regresión: 27/10/2026 18:40 se cancela si el reloj marca 20/10/2026', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    evento.fecha = '2026-10-27';
    evento.hora = '18:40:00';
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).save(evento);
    const respuestaReserva = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuestaReserva.status, 201, respuestaReserva.texto);
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    const ahoraOriginal = Date.now;
    Date.now = () => new Date(2026, 9, 20, 12, 0, 0).getTime();
    try {
      const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'), { tipo: 'sinpe_movil', telefono: '88887777' });
      assert.equal(respuesta.status, 200, respuesta.texto);
    } finally {
      Date.now = ahoraOriginal;
    }
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    if (reserva.comprobanteUrl) await unlink(resolve(process.cwd(), reserva.comprobanteUrl.replace(/^\/uploads\//, 'uploads/')));
  });

  test('rechaza una reserva pagada con menos de 48 horas aunque incluya devolución', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    evento.fecha = new Date().toISOString().slice(0, 10);
    evento.hora = '23:59:00';
    await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).save(evento);
    const respuestaReserva = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(respuestaReserva.status, 201, respuestaReserva.texto);
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'), { tipo: 'sinpe_movil', telefono: '88887777' });
    assert.equal(respuesta.status, 400, respuesta.texto);
    assert.match(respuesta.texto, /48 horas/);
    const reserva = await (await exigirConexionAislada()).getRepository(Reserva).findOneByOrFail({ id: reservaId });
    assert.equal(reserva.estado, EstadoReserva.PENDIENTE);
    if (reserva.comprobanteUrl) await unlink(resolve(process.cwd(), reserva.comprobanteUrl.replace(/^\/uploads\//, 'uploads/')));
  });

  test('cancela una reserva aprobada, cancela su Participante y libera un cupo', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(reservaId, 'aprobar', crearToken(admin.id, 'administrador'))).status, 200);

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 200, respuesta.texto);
    const conexion = await exigirConexionAislada();
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
    const participante = await conexion.getRepository(Participantes).findOneByOrFail({ usuarioId: usuario.id, eventoCapacitacionId: evento.id });
    const eventoActualizado = await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id });
    assert.equal(reserva.estado, EstadoReserva.CANCELADA);
    assert.equal(participante.estado, 'cancelada');
    assert.equal(eventoActualizado.cuposDisponibles, 3);
  });

  test('una reserva aprobada y cancelada se lista una sola vez con fecha persistida', async () => {
    const usuario = await crearUsuario(); const admin = await crearAdministrador(); const evento = await crearEvento(3);
    const creada = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const id = (creada.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(id, 'aprobar', crearToken(admin.id, 'administrador'))).status, 200);
    assert.equal((await cancelarReserva(id, crearToken(usuario.id, 'visitante'))).status, 200);
    const conexion = await exigirConexionAislada();
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id });
    assert.ok(reserva.fechaCancelacion);
    const lista = await solicitar('/api/inscripciones/mias', { headers: { Authorization: `Bearer ${crearToken(usuario.id, 'visitante')}` } });
    const items = comoObjeto(lista.body).data as Array<Record<string, unknown>>;
    const coincidentes = items.filter((item) => item.id === id && item.eventoCapacitacionId === evento.id);
    assert.equal(coincidentes.length, 1);
    assert.equal(coincidentes[0]?.estado, EstadoReserva.CANCELADA);
    assert.ok(coincidentes[0]?.fechaCancelacion);
  });

  test('una reserva pendiente cancelada conserva fecha y se lista una sola vez', async () => {
    const usuario = await crearUsuario(); const evento = await crearEvento(3);
    const creada = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const id = (creada.body as RespuestaReserva).data.id;
    assert.equal((await cancelarReserva(id, crearToken(usuario.id, 'visitante'))).status, 200);
    const lista = await solicitar('/api/inscripciones/mias', { headers: { Authorization: `Bearer ${crearToken(usuario.id, 'visitante')}` } });
    const items = comoObjeto(lista.body).data as Array<Record<string, unknown>>;
    const coincidentes = items.filter((item) => item.id === id && item.eventoCapacitacionId === evento.id);
    assert.equal(coincidentes.length, 1);
    assert.ok(coincidentes[0]?.fechaCancelacion);
  });

  test('cancelar una reserva dos veces no libera dos cupos', async () => {
    const usuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    const token = crearToken(usuario.id, 'visitante');

    assert.equal((await cancelarReserva(reservaId, token)).status, 200);
    const segunda = await cancelarReserva(reservaId, token);
    assert.equal(segunda.status, 400, segunda.texto);
    assert.equal((await (await exigirConexionAislada()).getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 3);
  });

  test('rechaza cancelar una reserva rechazada', async () => {
    const usuario = await crearUsuario();
    const admin = await crearAdministrador();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;
    assert.equal((await actualizarReservaComoAdmin(reservaId, 'rechazar', crearToken(admin.id, 'administrador'))).status, 200);

    const respuesta = await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'));
    assert.equal(respuesta.status, 400, respuesta.texto);
  });

  test('rechaza cancelar una reserva de otro usuario', async () => {
    const usuario = await crearUsuario();
    const otroUsuario = await crearUsuario();
    const evento = await crearEvento(3);
    const respuestaReserva = await reservar(evento.id, crearToken(usuario.id, 'visitante'));
    const reservaId = (respuestaReserva.body as RespuestaReserva).data.id;

    const respuesta = await cancelarReserva(reservaId, crearToken(otroUsuario.id, 'visitante'));
    assert.equal(respuesta.status, 403, respuesta.texto);
  });
});

describe('PATCH /api/admin/inscripciones/:id/devolucion-procesada', () => {
  const crearAdministrador = async () => {
    const admin = await crearUsuario();
    const conexion = await exigirConexionAislada();
    const rol = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(admin.id, { rol });
    return admin;
  };

  const prepararReservaConDevolucionPendiente = async () => {
    const conexion = await exigirConexionAislada();
    const usuario = await crearUsuario();
    const evento = await crearEvento(2);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    evento.precio = 5000;
    await conexion.getRepository(EventosCapacitaciones).save(evento);
    const creada = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(creada.status, 201, creada.texto);
    const reservaId = (creada.body as RespuestaReserva).data.id;
    const cancelada = await cancelarReserva(
      reservaId,
      crearToken(usuario.id, 'visitante'),
      { tipo: 'sinpe_movil', telefono: '88887777' },
    );
    assert.equal(cancelada.status, 200, cancelada.texto);
    return { conexion, usuario, evento, reservaId };
  };

  test('persiste referencia y fecha de procesamiento, y las expone solo a la administración', async () => {
    const { conexion, usuario, evento, reservaId } = await prepararReservaConDevolucionPendiente();
    const administrador = await crearAdministrador();
    const referencia = 'SINPE-QA-20261021-001';

    const respuesta = await registrarDevolucionProcesadaHttp(
      reservaId,
      crearToken(administrador.id, 'administrador'),
      referencia,
    );
    assert.equal(respuesta.status, 200, respuesta.texto);

    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
    assert.equal(reserva.referenciaDevolucion, referencia);
    assert.ok(reserva.devolucionProcesadaEn);

    const listaAdmin = await consultarInscripcionesAdmin(crearToken(administrador.id, 'administrador'));
    assert.equal(listaAdmin.status, 200, listaAdmin.texto);
    const inscripcion = (comoObjeto(listaAdmin.body).data as Array<Record<string, unknown>>)
      .find((item) => item.id === reservaId);
    assert.equal(inscripcion?.estado, EstadoReserva.CANCELADA);
    assert.deepEqual(inscripcion?.datosDevolucion, { tipo: 'sinpe_movil', telefono: '88887777' });
    assert.equal(inscripcion?.referenciaDevolucion, referencia);
    assert.ok(inscripcion?.devolucionProcesadaEn);
    assert.ok(inscripcion?.fechaCancelacion);
    assert.equal(inscripcion?.precio, 5000);

    const noAutorizado = await consultarInscripcionesAdmin(crearToken(usuario.id, 'visitante'));
    assert.equal(noAutorizado.status, 403, noAutorizado.texto);

    if (reserva.comprobanteUrl) {
      await unlink(resolve(process.cwd(), reserva.comprobanteUrl.replace(/^\/uploads\//, 'uploads/')));
    }
    assert.equal((await conexion.getRepository(EventosCapacitaciones).findOneByOrFail({ id: evento.id })).cuposDisponibles, 2);
  });

  test('rechaza a un visitante y reservas no elegibles sin persistir datos de devolución', async () => {
    const { conexion, usuario, reservaId } = await prepararReservaConDevolucionPendiente();
    const administrador = await crearAdministrador();

    const visitante = await registrarDevolucionProcesadaHttp(
      reservaId,
      crearToken(usuario.id, 'visitante'),
      'REF-NO-AUTORIZADA',
    );
    assert.equal(visitante.status, 403, visitante.texto);

    const eventoGratis = await crearEvento(2);
    const reservaGratis = await reservar(eventoGratis.id, crearToken(usuario.id, 'visitante'));
    assert.equal(reservaGratis.status, 201, reservaGratis.texto);
    const idGratis = (reservaGratis.body as RespuestaReserva).data.id;
    const noElegible = await registrarDevolucionProcesadaHttp(
      idGratis,
      crearToken(administrador.id, 'administrador'),
      'REF-GRATIS',
    );
    assert.equal(noElegible.status, 409, noElegible.texto);
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: idGratis });
    assert.equal(reserva.devolucionProcesadaEn, null);
    assert.equal(reserva.referenciaDevolucion, null);

    const listaAdmin = await consultarInscripcionesAdmin(crearToken(administrador.id, 'administrador'));
    const inscripcionGratis = (comoObjeto(listaAdmin.body).data as Array<Record<string, unknown>>)
      .find((item) => item.id === idGratis);
    assert.equal(inscripcionGratis?.datosDevolucion, null);
    assert.equal(inscripcionGratis?.devolucionProcesadaEn, null);
  });
});

describe('comprobante tras devolución procesada', () => {
  test('el administrador pierde acceso HTTP pero el comprobante y la devolución permanecen persistidos', async () => {
    const conexion = await exigirConexionAislada();
    const usuario = await crearUsuario();
    const administrador = await crearUsuario();
    const rol = await conexion.getRepository(RolModel).findOneByOrFail({ nombre: 'administrador' });
    await conexion.getRepository(UsuarioModel).update(administrador.id, { rol });
    const evento = await crearEvento(2);
    evento.esPago = true;
    evento.tipoPago = 'sinpe_movil';
    await conexion.getRepository(EventosCapacitaciones).save(evento);
    const creada = await reservarConComprobante(evento.id, crearToken(usuario.id, 'visitante'));
    assert.equal(creada.status, 201, creada.texto);
    const reservaId = (creada.body as RespuestaReserva).data.id;
    const tokenAdmin = crearToken(administrador.id, 'administrador');
    assert.equal((await fetch(`${baseUrl}/api/reservas/${reservaId}/comprobante`, { headers: { Authorization: `Bearer ${tokenAdmin}` } })).status, 200);
    assert.equal((await cancelarReserva(reservaId, crearToken(usuario.id, 'visitante'), { tipo: 'sinpe_movil', telefono: '88887777' })).status, 200);
    const procesada = await registrarDevolucionProcesadaHttp(reservaId, tokenAdmin, 'QA-DEV-PROCESADA');
    assert.equal(procesada.status, 200, procesada.texto);
    assert.equal((await fetch(`${baseUrl}/api/reservas/${reservaId}/comprobante`, { headers: { Authorization: `Bearer ${tokenAdmin}` } })).status, 404);
    const comprobante = await conexion.getRepository(ComprobantePago).findOneByOrFail({ reservaId });
    const reserva = await conexion.getRepository(Reserva).findOneByOrFail({ id: reservaId });
    assert.ok(comprobante.contenido);
    assert.equal(reserva.referenciaDevolucion, 'QA-DEV-PROCESADA');
    assert.ok(reserva.devolucionProcesadaEn);
    assert.deepEqual(reserva.datosDevolucion, { tipo: 'sinpe_movil', telefono: '88887777' });
  });
});
