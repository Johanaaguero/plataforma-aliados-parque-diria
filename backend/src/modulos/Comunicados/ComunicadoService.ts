import { AppDataSource } from '../../data-source'; import { Comunicado, PrioridadComunicado } from '../../models/Comunicado';
const repo=AppDataSource.getRepository(Comunicado);
export const listar=()=>repo.find({relations:{creadoPor:true},order:{fechaPublicacion:'DESC'}});
export const crear=(d:{titulo:string;contenido:string;prioridad:PrioridadComunicado;creadoPorId:number})=>repo.save(repo.create(d));
export const editar=async(id:number,d:Partial<Pick<Comunicado,'titulo'|'contenido'|'prioridad'>>)=>{const x=await repo.findOneBy({id});if(!x)throw new Error('No encontrado');Object.assign(x,d);return repo.save(x)};
export const eliminar=async(id:number)=>{const x=await repo.findOneBy({id});if(!x)throw new Error('No encontrado');await repo.remove(x)};
