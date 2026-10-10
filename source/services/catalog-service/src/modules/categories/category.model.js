import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:100},
  slug:{type:String,required:true,trim:true,lowercase:true,unique:true,match:/^[a-z0-9]+(?:-[a-z0-9]+)*$/},
  description:{type:String,required:true,trim:true,maxlength:500},
  imageUrl:{type:String,default:''},
  isFeatured:{type:Boolean,default:false},
  isActive:{type:Boolean,default:true}
}, {timestamps:true,versionKey:false});

categorySchema.index({isActive:1,isFeatured:1,name:1});

export function getCategoryModel(connection) {
  return connection.models.Category || connection.model('Category', categorySchema, 'categories');
}
