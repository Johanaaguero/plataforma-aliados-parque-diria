import { AppDataSource } from '../../data-source'; import { Comunicado, PrioridadComunicado } from '../../models/Comunicado'; import { Notificacion, TipoNotificacion } from '../../models/Notificacion'; import { Usuario } from '../../models/Usuario';
const repo=AppDataSource.getRepository(Comunicado);
const notificacionesRepo=AppDataSource.getRepository(Notificacion);
const usuariosRepo=AppDataSource.getRepository(Usuario);
export const listar=()=>repo.find({relations:{creadoPor:true},order:{fechaPublicacion:'DESC'}});
export const crear=async(d:{titulo:string;contenido:string;prioridad:PrioridadComunicado;creadoPorId:number})=>{const comunicado=await repo.save(repo.create(d));const usuarios=await usuariosRepo.find({select:{id:true}});if(usuarios.length){await notificacionesRepo.save(usuarios.map((usuario)=>notificacionesRepo.create({usuarioId:usuario.id,tipo:TipoNotificacion.NUEVO_COMUNICADO,titulo:comunicado.titulo,mensaje:comunicado.contenido,leida:false,referenciaId:comunicado.id,referenciaTipo:'comunicado'})));}return comunicado;};
export const editar=async(id:number,d:Partial<Pick<Comunicado,'titulo'|'contenido'|'prioridad'>>)=>{const x=await repo.findOneBy({id});if(!x)throw new Error('No encontrado');Object.assign(x,d);return repo.save(x)};
export const eliminar=async(id:number)=>{const x=await repo.findOneBy({id});if(!x)throw new Error('No encontrado');await repo.remove(x)};
