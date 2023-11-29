const {DataTypes, Model}= require('sequelize');
const {sequelizeObj}= require('../database/config');

const providers= sequelizeObj.define(
    'providers',{
        provider_id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            unique:true,
            autoIncrement:true,
            allowNull:false
        },
        provider_name:{
            type:DataTypes.CHAR,
            allowNull:false
            validate:{
                notEmpty:true,
                is:/^[a-zA-ZáéíóúüñÑÁÉÍÓÚÜ0-9.,\s]+$/
            }
        },
        phone_number:{
            type:DataTypes.CHAR,
            allowNull:false,
            unique:true,
            validate:{
                notEmpty:true,
                is:/^\d{4}-\d{4}$/
            }
        },
        bank_account:{
            type:DataTypes.INTEGER,
            allowNull:false,
            validate:{
                notEmpty:true,
                is:/^\d+$/
            }
        },
        bank_name:{
            type:DataTypes.CHAR,
            allowNull:false,
            validate:{
                notEmpty:true,
                is:/^[a-zA-ZáéíóúüñÑÁÉÍÓÚÜ\s]+$/
            }
        },
        type_account:{
            type:DataTypes.CHAR,
            allowNull:false,
            validate:{
                notEmpty:true,
                is:/^[a-zA-ZáéíóúüñÑÁÉÍÓÚÜ\s]+$/
            }
        },
        payment_methods:{
            type:DataTypes.CHAR,
            allowNull:false,
            validate:{
                notEmpty:true,
                is:/^[a-zA-ZáéíóúüñÑÁÉÍÓÚÜ\s]+$/
            }
        },
        service_description:{
            type:DataTypes.CHAR,
            allowNull:false,
            validate:{
                notEmpty:true,
                is:/^[a-zA-ZáéíóúüñÑÁÉÍÓÚÜ,\s]+$/
            }
        }

    },{
        sequelize:sequelizeObj,
        modelName:"providers",
        freezeTableName:true,
        createdAt:false,
        updatedAt:false
    }
)
module.exports = providers