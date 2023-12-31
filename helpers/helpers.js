// Generación de tokens
const jwt = require('jsonwebtoken');
const jwtGenerate =(id,user_type,secret,expiresTime)=>{
    return new Promise((resolve,reject)=>{
        const payload ={id,user_type}
        jwt.sign(payload,secret,{
            expiresIn:expiresTime
        },(err,token)=>{
            if (err) {
                reject("no se pudo generar el token")
            }else{
                resolve(token)
            }
        })
    })
}
// HASEANDO LA CONTRASEÑA 
const bcrypt = require('bcrypt');
const hashingPassword = (password)=>{
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash
}
const updateData = async(model,objectToEdit,searchField, targetField)=>{
    
    try {
        const update = await model.update(objectToEdit,{
            where:{
                [targetField]:searchField
            }
        });      
        if (update>0) {
            return 'Se han actualizado los datos '
        }else{
            throw new Error('No se han podido actualizar los datos')
        }
    } catch (error) {
        throw new Error(error)
    }
 
}
const findData=async(model, searchField, targetField, excludeArr)=>{
    
    try {
        const foundData= await model.findOne({
            where:{
                [targetField]:searchField
            },
            attributes:{
                exclude:excludeArr
            }
        })
        if (!foundData) {
           return null
        }else{
            return foundData.dataValues
        }
    } catch (error) {
        throw new Error(error);
    }
}

const { startOfMonth, endOfMonth , format } = require('date-fns');
function getStartAndEndOfMonth(dateString) {
    const date = new Date(dateString)
    let dayOfDate=date.getUTCDate();
    const yearOfDate= date.getFullYear()
    const monthOfDate = date.getMonth()
    if (dayOfDate===1) {
        dayOfDate =dayOfDate+1
    }
    const newDate = new Date (`${yearOfDate}-${monthOfDate +1}-${dayOfDate}`);
    return {
        start_month:format(startOfMonth(newDate),'yyyy-MM-dd'),
        end_month:format(endOfMonth(newDate),'yyyy-MM-dd'),
    
    }
    
}
const hourAdder =(start_reserv_time,end_reserv_time)=>{
    
    const [start_hour, start_minutes] = start_reserv_time.split(':').map(Number);
    const [end_hour, end_minutes] = end_reserv_time.split(':').map(Number);

    const inicioMS = (start_hour * 60 + start_minutes) * 60 * 1000;
    const finMS = (end_hour * 60 + end_minutes) * 60 * 1000;
    const hourDifference = (finMS  - inicioMS)/3600000;
    return hourDifference
    
}
module.exports={
        jwtGenerate,
        hashingPassword,
        updateData,
        findData,
        getStartAndEndOfMonth,
        hourAdder
}