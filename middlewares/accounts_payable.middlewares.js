const {response, request}= require('express')

const{
    bodyVerification,
    tokenValidation,
    validationDates,
    validationParagraph,
    ValidationIdOrLevel,
    userExist,
    validatePage,
    validationYear
}= require('./common.middlewares')
const bank_accounts = require('../models/bank_accounts.model');
const providers = require('../models/providers.model')
const user = require('../models/user.model')
const accounts_payable = require('../models/account_payable.model')
const createAccountPayableValidations = async(req = request , res = response, next)=>{
    const token = req.cookies.authorization
    const {
        invoice_id,
        invoice_date, 
        concept, 
        amount, 
        number_of_transaction, 
        paid, 
        id_bank_account, 
        id_provider_account
    }= req.body
    try {
        // await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        bodyVerification(req.body,['invoice_id', 'invoice_date', 'concept', 'amount', 'number_of_transaction', 'paid', 'id_bank_account', 'id_provider_account'])
        validationInvoiceId(invoice_id);
        validationDates(invoice_date,'fecha de factura');
        validationParagraph(concept);
        validationAmount(amount);
        validationNumberOfTransaccion(number_of_transaction);
        // por sino trae la propiedad paid
        paid?req.body.paid=paid:req.body.paid=2
        ValidationIdOrLevel('id de la cuenta de banco',id_bank_account);
        ValidationIdOrLevel('id del proveedor',id_provider_account);
        await  userExist('La cuenta de banco que solicita',bank_accounts,id_bank_account,'account_id',[ 'bank','account_number','type_account']);
        await  userExist('El provdeedor', providers,id_provider_account,'provider_id',[ 'provider_name', 'phone_number', 'bank_account', 'bank_name', 'type_account', 'payment_methods', 'service_description'])
        next()
    }catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const getAccountsPayableValidations = async(req = request , res = response, next)=>{
    const token = req.cookies.authorization
    const {page,start_range_date,end_range_date,paid}= req.query
    
    try {
        // await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']); 
        validatePage(parseInt(page));
        req.page=parseInt(page),
        delete req.query.page
        validationsFilterFields(req.query)
        next()
    }catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const getAccountPayableDataValidations = async(req = request , res = response, next)=>{
    const token = req.cookies.authorization
    const account_id = req.params.account_id
    try {
        // await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        ValidationIdOrLevel('id de la cuenta por pagar',account_id);
        await  userExist('La cuenta por pagar ',accounts_payable,account_id,'account_id',['invoice_id', 'invoice_date', 'concept', 'amount', 'number_of_transaction', 'paid', 'id_bank_account', 'id_provider_account']);
        next()
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}
const updateAccountPayableValidations = async(req = request , res = response, next)=>{
    const token = req.cookies.authorization
    const account_id = req.params.account_id
    const {
        invoice_id,
        invoice_date, 
        concept, 
        amount, 
        number_of_transaction, 
        paid, 
        id_bank_account, 
        id_provider_account
    }= req.body;

    try {
        console.log( req.body);
        updatedAccountPayableValidations(req.body)
        // await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);;
        ValidationIdOrLevel('id de la cuenta por pagar',account_id);
        // await  userExist('La cuenta de banco que solicita',bank_accounts,id_bank_account,'account_',[ 'bank','account_number','type_account']);
        // hacer un innerJoin entre estos dos modelos 
        // await  userExist('El provdeedor', providers,id_provider_account,'provider_id',[ 'provider_name', 'phone_number', 'bank_account', 'bank_name', 'type_account', 'payment_methods', 'service_description']);
        await  userExist('La cuenta por pagar ',accounts_payable,account_id,'account_id',['invoice_id', 'invoice_date', 'concept', 'amount', 'number_of_transaction', 'paid', 'id_bank_account', 'id_provider_account']);
        next();
    }catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }

}
const changeAccountPaidStatusValidations = async(req = request , res = response, next)=>{
    const token = req.cookies.authorization;
    const {
        paid,
        account_id
    }=req.body
    try {
        // await tokenValidation(token,user,'user_id',['name','lastname','email','phone_number','dpi','password'],process.env.SECRETKEYAUTH,['admin']);
        await  userExist('La cuenta por pagar ',accounts_payable,account_id,'account_id',['invoice_id', 'invoice_date', 'concept', 'amount', 'number_of_transaction', 'paid', 'id_bank_account', 'id_provider_account']);
        validationPaidStatus(paid);
        next();
    } catch (error) {
        return res.status(400).json({
            error:error.message,
            ok:false
        })
    }
}

const updatedAccountPayableValidations =(objectBody)=>{
    const accountPayableDataValidations ={
        'invoice_id':(value)=>{
            validationInvoiceId(value)
        },
        'invoice_date':(value)=>{
            console.log(value);
            validationDates(value,'fecha de factura')
        },
        'concept':(value)=>{
            validationParagraph(concept);
        },
        'amount':(value)=>{
            validationAmount(value)
        },
        'number_of_transaction':(value)=>{
            validationNumberOfTransaccion(value)
        },  
        'paid':(value)=>{
            validationPaidStatus(value)
        },
        'id_bank_account':(value)=>{
            console.log(value);
            ValidationIdOrLevel('id de la cuenta bancaria ',value)
        },
        'id_provider_account':(value)=>{
            console.log(value);
            ValidationIdOrLevel('id del provedor ',value)
        }
    }
    Object.keys(objectBody).forEach(propertyName=>{
        if (accountPayableDataValidations.hasOwnProperty(propertyName)) {
            accountPayableDataValidations[propertyName](objectBody[propertyName])
        }else{
            throw new Error('Se han enviado propiedades inválidas');
        }
    })
}
module.exports ={
    createAccountPayableValidations,
    getAccountsPayableValidations,
    getAccountPayableDataValidations,
    updateAccountPayableValidations,
    changeAccountPaidStatusValidations,
}
const validationsFilterFields =(queryObject)=>{
    const queryObjectValidations={
        'queryMonths':(value)=>{
            if ( typeof value !='Array') {
                throw new Error('Debes enviar un arreglo de meses')
            }
            const areNumbers = value.every((element) => typeof element === 'number');
            if (!areNumbers) {
                throw new Error('todas las pocisiones del arreglo deben ser números')
            }
            const maxValue = Math.max(...value)
            if (maxValue>12) {
                throw new Error ('No puede venir un mes que sea mayor a 12')
            }
            const minValue = Math.min(...value)
            if (minValue<=0) {
                throw new Error('No existe un mes 0 o menor que 0')
            } 
        },
        'year':(value)=>{
            validationYear(value)
        },
        'paid':(value)=>{
            validationPaidStatus(value)
        }
    }
    Object.keys(queryObject).forEach(propertyName=>{
        if (queryObjectValidations.hasOwnProperty(propertyName)) {
            queryObjectValidations[propertyName](queryObject[propertyName])
        }else{
            console.log(propertyName);
            throw new Error('Se han enviado propiedades inválidas');
        }
    })

}
const validationInvoiceId=(invoice_id)=>{
    const regexInvoiceId =/^[a-zA-Z0-9]+$/

    if (!invoice_id) {
        throw new Error('El número de factura no puede venir vacío')
    }if (!regexInvoiceId.test(invoice_id)) {
        throw new Error('El número de factura contiene caractéres inválidos')
    }
}
const validationAmount =(amount)=>{
    const regexAmount = /^[\d]{1,5}[.][\d]{2}/
    if (!amount) {
        throw new Error('El monto de la cuenta no puede venir vacío');
    }
    if (!regexAmount.test(amount)) {
        throw new Error('El precio debe ser en este formato 0.00')
    }
}
const validationNumberOfTransaccion= (number_of_transaction)=>{
    const regexNumberOfTransaccion=/^[\d]{1,3}/
    if (!number_of_transaction) {
        throw new Error('El número de transaccion no debe venir vacio')
    }
    if (!regexNumberOfTransaccion.test(number_of_transaction)) {
        throw new Error('El número de transaccion solo debe incluir números')
    }
}
const validationPaidStatus =(paid)=>{
    const regexPaidStatus=/^1|2/

    if (!paid) {
        throw new Error('La cuenta debe estar registrada como pagada o no pagada su estado no puede venir vacío')
    }
    if (!regexPaidStatus.test(paid)) {
        throw new Error('El estatus de pago de la cuenta trae caractéres inválidos ')
    }
}