import mongoose from 'mongoose';
const entities=['pages','regions','media','settings','inquiries','users','sessions','redirects','audit','limits'];
const models={};
for(const name of entities){
 const schema=new mongoose.Schema({_id:String,version:{type:Number,default:1},value:{type:mongoose.Schema.Types.Mixed,required:true}},{versionKey:false,collection:name});
 if(['sessions','limits'].includes(name)){schema.add({expiresAt:Date});schema.index({expiresAt:1},{expireAfterSeconds:0});}
 models[name]=mongoose.models['BG_'+name]||mongoose.model('BG_'+name,schema);
}
export async function mongoStore(uri){
 await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});
 return {
  async get(kind,id){const r=await models[kind].findById(id).lean();return r?{...r.value,version:r.version}:null;},
  async list(kind){return (await models[kind].find().lean()).map(r=>({...r.value,version:r.version}));},
  async put(kind,id,value,expected){
   const M=models[kind];const data={...value,id};delete data.version;
   const expiresAt=value.expiresAt?new Date(value.expiresAt):undefined;
   if(expected===0){try{await M.create({_id:id,value:data,version:1,expiresAt});return {...data,version:1};}catch(e){if(e.code===11000)throw Object.assign(new Error('This record already exists. Refresh and try again.'),{status:409});throw e;}}
   if(expected!==undefined){const r=await M.findOneAndUpdate({_id:id,version:expected},{$set:{value:data,expiresAt},$inc:{version:1}},{new:true}).lean();if(!r)throw Object.assign(new Error('Another editor changed this record. Reload before saving.'),{status:409});return {...r.value,version:r.version};}
   const r=await M.findByIdAndUpdate(id,{$set:{value:data,expiresAt},$inc:{version:1}},{new:true,upsert:true}).lean();return {...r.value,version:r.version};
  },
  async remove(kind,id){await models[kind].deleteOne({_id:id});},
  async close(){await mongoose.disconnect();}
 };
}
