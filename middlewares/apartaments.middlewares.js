const {request, response }= require('express');
const {
    validateName,
    bodyVerification,
    validationEmail,
    validatePhoneNumber,
    validationPassword,
    tokenValidation,
    ValidationIdOrLevel,
    validationOcupationState,
    userExist
}= require('../middlewares/common.middlewares');
const user = require('../models/user.model');
const apartament = require('../models/apartament.model')
const getApartamentsValidations=async(req=request , res = response, next)=>{
    const token = req.headers.authorization
    const level = req.params.level
    try {
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        ValidationIdOrLevel('nivel deseado',level)
        next();
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        });
    }
}
const getApartamentValidations = async(req = request , res = response, next)=>{
    const token = req.headers.authorization
    console.log(req);
    try {
        ValidationIdOrLevel('id del apartamento',req.params.apartament_id);
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        const apartamentData =  await userExist('apartamento que solicita',apartament,req.params.apartament_id,'apartament_id',[]);
        req.apartament= apartamentData
        next()
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const updateParkingDataValidations = async(req= request , res = response , next)=>{
    const token = req.headers.authorization;
    const apartament_id = req.params.apartament_id;
    try {
        ValidationIdOrLevel('id del apartamento ',apartament_id);

        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await userExist('apartamento que solicita',apartament,apartament_id,'apartament_id',['apartament_number', 'apartament_name', 'apartament_level', 'pedestrian_cards', 'parking_data', 'tenant_name', 'phone_number_tenant', 'landlord_name', 'phone_number_landlord', 'id_features_apartament', 'ocupation_state']);

        updateParkingDataValidationsBody(req.body)
        next()
    }catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const updatePedestrianDataValidations = async(req= request , res = response , next)=>{
    const token =req.headers.authorization
    const apartament_id = req.params.apartament_id
    try {
        ValidationIdOrLevel('id del apartamento ',apartament_id);
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await userExist('apartamento que solicita',apartament,apartament_id,'apartament_id',['apartament_number', 'apartament_name', 'apartament_level', 'pedestrian_cards', 'parking_data', 'tenant_name', 'phone_number_tenant', 'landlord_name', 'phone_number_landlord', 'id_features_apartament', 'ocupation_state']);
        Object.entries(req.body).forEach(([sticker, stickerNumber ]) => {
            ValidationStickerValues(stickerNumber)
        });
        next()
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const changeOcupationStateValidations = async (req = request, res = respose, next)=>{
    const token = req.headers.authorization
    const apartament_id = req.params.apartament_id
    const {ocupation_state}= req.body
    try {
        validationOcupationState('estado de ocupacion',ocupation_state);
        ValidationIdOrLevel('id del apartamento ',apartament_id);
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await userExist('apartamento que solicita',apartament,apartament_id,'apartament_id',['apartament_number', 'apartament_name', 'apartament_level', 'pedestrian_cards', 'parking_data', 'tenant_name', 'phone_number_tenant', 'landlord_name', 'phone_number_landlord', 'id_features_apartament', 'ocupation_state']);
        next()
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const updateLandlordOrTenantDataValidations = async(req= request , res = response, next)=>{
    const token = req.headers.authorization
    const apartament_id = req.params.apartament_id
    const {name, phone_number}= req.body
    try {
        bodyVerification(req.body,['name','phone_number'])
        validateName(name,60);
        validatePhoneNumber(phone_number);
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await userExist('apartamento que solicita',apartament,apartament_id,'apartament_id',['apartament_number', 'apartament_name', 'apartament_level', 'pedestrian_cards', 'parking_data', 'tenant_name', 'phone_number_tenant', 'landlord_name', 'phone_number_landlord', 'id_features_apartament', 'ocupation_state']);
        next()
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}

const updateApartamentNameValidations = async(req= request , res = response, next)=>{
    const token = req.headers.authorization
    const apartament_id = req.params.apartament_id
    const {apartament_name}= req.body
    try {
        validateName(apartament_name,60)
        await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await userExist('apartamento que solicita',apartament,apartament_id,'apartament_id',['apartament_number', 'apartament_name', 'apartament_level', 'pedestrian_cards', 'parking_data', 'tenant_name', 'phone_number_tenant', 'landlord_name', 'phone_number_landlord', 'id_features_apartament', 'ocupation_state']);
        next();
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
module.exports= {
    getApartamentsValidations,
    getApartamentValidations,
    updateParkingDataValidations,
    updatePedestrianDataValidations,
    changeOcupationStateValidations,
    updateLandlordOrTenantDataValidations,
    updateApartamentNameValidations
}
// validaciones especificas de los parqueos
const updateParkingDataValidationsBody=(objectBody)=>{
    const validationsParkingData={
        'parking_cards':(value)=>{
            Object.entries(value).forEach(([sticker, stickerNumber ]) => {
                ValidationStickerValues(stickerNumber)
            });
        },
        'parking_spaces':(value)=>{
            for (let i = 0; i < value.length; i++) {
                validationParkingSpacesValues(value[i])
            }
        }
    };
    Object.keys(objectBody).forEach(propertyName=>{
        if (validationsParkingData.hasOwnProperty(propertyName)) {
            validationsParkingData[propertyName](objectBody[propertyName])
        }else{
            throw new Error('El objeto body trae una propiedad invalida')
        }
    })
}

const ValidationStickerValues=(stickerNumber)=>{
    const regexStickerNumber = /^\d{3,15}$/
    try {
        if (!stickerNumber) {
            throw new Error('El sticker viene vacio')
        }else if(!regexStickerNumber.test(stickerNumber)){
            throw new Error('El  sticker de parqueo contiene caracteres no válidos')

        }
    } catch (error) {
        throw  new Error(error)
    }
}
const validationParkingSpacesValues=(parkinSpacesValues)=>{
    const regexParkingSpaces = /^primer nivel|segundo nivel|tercer nivel|[1-9]$/
    try {
        if (!parkinSpacesValues) {
            throw new Error('No rellenaste los espacios de parqueos')
        }else if(!regexParkingSpaces.test(parkinSpacesValues)){
            throw new Error('Los espacios de parqueo contiene caracteres no válidos')

        }
    } catch (error) {
        throw  new Error(error)
    }
}