'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const colors = require('colors');
const axios = require('axios');
const fs = require('fs');

const ecwid = require("./ecwidSdk");
const ecwidScript = require("./ecwidScript");
const ecwidCloud = require("./cloudfront");

const { NODE_ENV, DROPPA_SERVICE_ID } = process.env;
const webhookInstallationPath = "./application_installed.json";
const userSavedKeys = "./application_saved_keys.json";

const {
    storeProfileInformation,
    droppa_get_quote,
    droppa_post_booking,
    getCurrentCartDetails,
    getCurrentOrderDetails,
    getCorrectSuburbName,
    droppa_post_payment
} = require('./controller/ecwidController');

const EcwidOrders = require('./model/EcwidOrders');
const EcwidSettings = require('./model/EcwidSettings');
const mongodb_connection = require('./config/db');
const errorHandler = require('./middleware/error');

let { globalOrderId, EcwidOrderObjectId, globalCartId } = '';

const app = express();

/**
 * @description     - Parser
 */
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('json spaces', 2);
/* Mongoose URI Connection */
mongodb_connection._connection();
/**
 * @description     - Cross Site Middleware
 */
app.use(cors({ origin: '*', credentials: true, optionsSuccessStatus: 200 }));
/**
 * @description     - Loader
 */
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Request-Methods", "POST, GET, PUT, DELETE");
    next();
});
/**
 * @description     - Middleware for development
 */
if (NODE_ENV === 'production') {
    app.use(morgan('dev'));
}

/**
 * @description     - Access Public Directory To View The iframe Html File
 */

app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, "public", "iframe.html")));

/**
 * @description     - Send Post Request To GET Ecwid Shipping Response
 * @method          - POST
 */

app.post('/', async (req, res) => {

    let { shippingOptionsArray, generateQuote, baseWeight, basePrice } = '';

    if (!req.body.id && req.body.id === 'undefined') return false;

    baseWeight = req.body.cart.weight
    
    try {
        generateQuote = await droppa_get_quote(res, baseWeight);
        basePrice = generateQuote.data.price;

        shippingOptionsArray = new Array({
            title: "Droppa Shipping (1 - 3 days)",
            rate: (basePrice ? basePrice : 0.00),
            transitDays: "1-3",
            descriptions: "Courier Express"
        });

        const shippingObject = {
            shippingOptions: shippingOptionsArray
        }
        return res.status(200).send(shippingObject);
    } catch (error) {
        return res.status(500).json({ error });
    }
});

app.post('/webhook', async (req, res) => {
    
    let { eventType, eventCreated, eventId, storeId } = req.body;
    let cardDetails = req.body.data;

    const isTheStoreNameAvailable = await EcwidSettings.find({}).where("store_id").equals(storeId).exec();

    isTheStoreNameAvailable.filter(async (storeIsAvailable) => {

        let sha256 = crypto.createHmac('sha256', `${eventCreated}.${eventId}`).update("XUEgZxrHILOYz7heko0zg0NT5ryNfvTM").digest("base64");
        // console.log({ "X-Ecwid-Webhook-Signature": sha256 });

        let {
            postBookingObject,
            parcelDims,
            orderComments,
            ecwidProductTotalWeight,
            companyPickUpSuburb,
            companyProvince,
            ecwidProfileCompanyCompanyCity,
            ecwidProfileCompanyName,
            ecwidProfileStoreName,
            companyStreetAddress,
            ecwidPickUpPostalCode,
            companyPickUpSuburbCall
        } = '';

        let { storeInformation, cartInformation, orderInformation, createDroppaBookings, makePaymentForCurrentBooking } = '';

        let {
            customerCompanyName,
            customerStreet,
            customerCity,
            customerPostalCode,
            customerLastName,
            customerFirstName,
            customerPhoneNumber,
            customerFullName,
            customerProvince,
            customerEmail,
            customerDropOffSuburb,
            customerDropOffSuburbCall
        } = ''

        storeInformation = await storeProfileInformation(storeId, storeIsAvailable.public_key);

        if (eventType === "application.uninstalled") {

            const isDataAvailableToRemove = await EcwidSettings.findOne({}).where("storeId").equals(storeId).exec();

            if (isDataAvailableToRemove !== null) {
                EcwidSettings.findByIdAndDelete({ _id: isDataAvailableToRemove._id }, (error, recordDeleted) => {
                    if (error) console.log({ error });

                    console.log('Droppa App has been successfully uninstalled.');
                    return res.sendStatus(200);
                });
            }
            console.log('Droppa App has been successfully uninstalled.');
            return res.sendStatus(200);
        }

        ecwidProfileCompanyName = storeInformation.data.company.companyName;
        ecwidProfileStoreName = storeInformation.data.generalInfo.storeUrl.substring(8, storeInformation.data.generalInfo.storeUrl.indexOf(".site"));
        companyStreetAddress = storeInformation.data.company.street;
        ecwidPickUpPostalCode = storeInformation.data.company.postalCode;
        ecwidProfileCompanyCompanyCity = storeInformation.data.company.city;

        switch (storeInformation.data.company.stateOrProvinceCode) {
            case 'EC':
                companyProvince = "EASTERN_CAPE";
                break;

            case 'FS':
                companyProvince = "FREE_STATE";
                break;

            case 'GP':
                companyProvince = "GAUTENG";
                break;

            case 'KZN':
                companyProvince = "KWA_ZULU_NATAL";
                break;

            case 'LP':
                companyProvince = "LIMPOPO";
                break;

            case 'MP':
                companyProvince = "MPUMALANGA";
                break;

            case 'NC':
                companyProvince = "NORTHERN_CAPE";
                break;

            case 'NW':
                companyProvince = "NORTHERN_WEST";
                break;

            case 'WC':
                companyProvince = "WESTERN_CAPE";
                break;
        }

        if (eventType === "unfinished_order.created") {
            globalOrderId = req.body.data.orderId;
            globalCartId = cardDetails.cartId;
            console.log(globalCartId === cardDetails.cartId, globalCartId, cardDetails.cartId);
            console.log(globalOrderId === cardDetails.orderId, globalOrderId, cardDetails.orderId);
            return res.sendStatus(200);
        }

        try {
            cartInformation = await getCurrentCartDetails(storeId, globalCartId, storeIsAvailable.private_key);

            if (cartInformation.data.orderComments !== undefined) {

                if (eventType === "unfinished_order.updated") {
                    if ((globalCartId === cardDetails.cartId) || (globalOrderId === cardDetails.orderId)) {

                        switch (cartInformation.data.shippingPerson.stateOrProvinceCode) {
                            case 'EC':
                                customerProvince = "EASTERN_CAPE";
                                break;

                            case 'FS':
                                customerProvince = "FREE_STATE";
                                break;

                            case 'GP':
                                customerProvince = "GAUTENG";
                                break;

                            case 'KZN':
                                customerProvince = "KWA_ZULU_NATAL";
                                break;

                            case 'LP':
                                customerProvince = "LIMPOPO";
                                break;

                            case 'MP':
                                customerProvince = "MPUMALANGA";
                                break;

                            case 'NC':
                                customerProvince = "NORTHERN_CAPE";
                                break;

                            case 'NW':
                                customerProvince = "NORTHERN_WEST";
                                break;

                            case 'WC':
                                customerProvince = "WESTERN_CAPE";
                                break;
                        }

                        // switch (cartInformation.data.billingPerson.stateOrProvinceCode) {
                        //     case 'EC':
                        //         customerProvince = "EASTERN_CAPE";
                        //         break;

                        //     case 'FS':
                        //         customerProvince = "FREE_STATE";
                        //         break;

                        //     case 'GP':
                        //         customerProvince = "GAUTENG";
                        //         break;

                        //     case 'KZN':
                        //         customerProvince = "KWA_ZULU_NATAL";
                        //         break;

                        //     case 'LP':
                        //         customerProvince = "LIMPOPO";
                        //         break;

                        //     case 'MP':
                        //         customerProvince = "MPUMALANGA";
                        //         break;

                        //     case 'NC':
                        //         customerProvince = "NORTHERN_CAPE";
                        //         break;

                        //     case 'NW':
                        //         customerProvince = "NORTHERN_WEST";
                        //         break;

                        //     case 'WC':
                        //         customerProvince = "WESTERN_CAPE";
                        //         break;
                        // }

                        cartInformation.data.items.filter((item) => {
                            if (item.weight !== 0) {
                                parcelDims = new Array({
                                    "parcel_length": 0,
                                    "parcel_breadth": 0,
                                    "parcel_height": 0,
                                    "parcel_mass": item.weight
                                });
                            }
                        });

                        customerCompanyName = (cartInformation.data.shippingPerson.companyName ? cartInformation.data.shippingPerson.companyName : 'Null');
                        customerStreet = (cartInformation.data.shippingPerson.street ? cartInformation.data.shippingPerson.street : cartInformation.data.billingPerson.street);
                        customerCity = (cartInformation.data.shippingPerson.city ? cartInformation.data.shippingPerson.city : cartInformation.data.billingPerson.city);
                        customerPostalCode = (cartInformation.data.shippingPerson.postalCode ? cartInformation.data.shippingPerson.postalCode : cartInformation.data.billingPerson.postalCode);
                        customerLastName = (cartInformation.data.shippingPerson.lastName ? cartInformation.data.shippingPerson.lastName : cartInformation.data.billingPerson.lastName);
                        customerFirstName = (cartInformation.data.shippingPerson.firstName ? cartInformation.data.shippingPerson.firstName : cartInformation.data.billingPerson.firstName);
                        customerPhoneNumber = (cartInformation.data.shippingPerson.phone ? cartInformation.data.shippingPerson.phone : cartInformation.data.billingPerson.phone);
                        customerFullName = (cartInformation.data.shippingPerson.name ? cartInformation.data.shippingPerson.name : cartInformation.data.billingPerson.name);
                        customerEmail = cartInformation.data.email;

                        if (ecwidPickUpPostalCode)
                            companyPickUpSuburbCall = await getCorrectSuburbName(ecwidPickUpPostalCode);

                        if (customerPostalCode)
                            customerDropOffSuburbCall = await getCorrectSuburbName(customerPostalCode);

                        companyPickUpSuburb = companyPickUpSuburbCall.data.suburb;
                        customerDropOffSuburb = customerDropOffSuburbCall.data.suburb;

                        postBookingObject = {
                            "serviceId": DROPPA_SERVICE_ID,
                            "platform": "Ecwid",
                            "pickUpPCode": ecwidPickUpPostalCode,
                            "dropOffPCode": customerPostalCode,
                            "fromSuburb": companyPickUpSuburb,
                            "toSuburb": customerDropOffSuburb,
                            "province": companyProvince ? companyProvince : 'Null',
                            "destinationProvince": customerProvince ? customerProvince : 'Null',
                            "pickUpAddress": `${companyStreetAddress}, ${companyPickUpSuburb}, ${ecwidPickUpPostalCode}`,
                            "pickUpCompanyName": (ecwidProfileCompanyName ? ecwidProfileCompanyName : ""),
                            "customerName": customerFirstName,
                            "customerSurname": customerLastName,
                            "customerPhone": customerPhoneNumber,
                            "customerEmail": customerEmail,
                            "price": cartInformation.data.shippingOption.shippingRate,
                            "dropOffAddress": `${customerStreet}, ${customerDropOffSuburb}, ${customerPostalCode}`,
                            "dropOffCompanyName": (customerCompanyName ? customerCompanyName : ""),
                            "pickUpUnitNo": "",
                            "dropOffUnitNo": "",
                            "parcelDimensions": parcelDims,
                            "instructions": (cartInformation.data.orderComments ? cartInformation.data.orderComments : 'Default Ecommerce widget Instructions'),
                            "shopify_orderNo": globalOrderId,
                            "storeName": `${ecwidProfileStoreName}.site`,
                        }

                        const ecwirdOrderId = await EcwidOrders.findOne({}).where('ecwid_order_id').equals(globalOrderId).exec();

                        if (ecwirdOrderId !== null) return res.sendStatus(400);

                        createDroppaBookings = await droppa_post_booking(postBookingObject);

                        let neworder_indb = new EcwidOrders({
                            serviceId: process.env.DROPPA_SERVICE_ID,
                            droppa_booking_oid: createDroppaBookings.data.oid,
                            droppa_tracknumber: createDroppaBookings.data.trackNo,
                            droppa_booking_type: createDroppaBookings.data.type,
                            ecwid_order_id: globalOrderId
                        });

                        if (createDroppaBookings.status === 200) {
                            EcwidOrderObjectId = createDroppaBookings.data.oid;

                            await EcwidOrders.create(neworder_indb);
                        }

                        return res.sendStatus(200);
                    }
                    return res.sendStatus(200);
                }

                if (eventType === "order.created") {
                    try {
                        if ((cardDetails.newPaymentStatus === "PAID") || (cardDetails.oldPaymentStatus === "PAID")) {
                            makePaymentForCurrentBooking = await droppa_post_payment(EcwidOrderObjectId);

                            console.log(makePaymentForCurrentBooking)

                            if (makePaymentForCurrentBooking.data.oid) {
                                return res.sendStatus(200);
                            }
                        }
                    } catch (error) {
                        console.log({ "Payment Gateway Error": error })
                        return res.sendStatus(200);
                    }
                }

                if (eventType === "order.deleted") {
                    console.log("Order Cancelled");
                    return res.sendStatus(200);
                }

                if (eventType === "unfinished_order.deleted") {
                    console.log("Unfinished Order Cancelled");
                    return res.sendStatus(200);
                }
            }

        } catch (error) {
            console.log({ "Booking Gateway Error": error })
            return res.status(200).send(error);
        }

        return res.sendStatus(200);
    });

});
/**
 * @description - Saves user Keys
 * @access      - Public
 * @method      - POST
 * @returns     - save_user_keys
*/
app.post('/save_user_keys', async (req, res) => {

    let { api_key, service_key, storeName, store_Id, public_key, private_key } = req.body.bodyData;

    let newUserModel = {
        api_key,
        service_key,
        storeName,
        store_Id,
        public_key,
        private_key
    }

    const saveEcwidSettings = new EcwidSettings(newUserModel);

    await EcwidSettings.findOne({ store_Id: `${newUserModel.store_Id}` },
        async (error, foundStoreName) => {

            if (error) console.log({ error });

            if (foundStoreName === null) {
                return await saveEcwidSettings.save((error, savedResults) => {
                    if (error) console.log({ error });

                    fs.writeFile("./application_saved_keys.json", newUserModel, function (err, data) {
                        if (err) {
                            return console.log(err);
                        }
                        console.log(data);
                    });

                    if (savedResults) {
                        res.json({
                            updatedKeys: 'Your keys were successfully saved.',
                            dataResponse: savedResults,
                            status: 200
                        });
                    }
                });
            } else {
                return await EcwidSettings.findOneAndUpdate(
                    { store_Id: newUserModel.api_key },
                    newUserModel,
                    { upsert: true, new: true },
                    async (error, results) => {
                        if (error) console.log({ error });

                        const storeInformation = await EcwidSettings.findOne({}).where('store_Id').equals(results.store_Id).exec();

                        fs.writeFile("./application_saved_keys.json", newUserModel, function (err, data) {
                            if (err) {
                                return console.log(err);
                            }
                            console.log(data);
                        });

                        res.json({
                            updatedKeys: 'Your keys were successfully updated.',
                            dataResponse: storeInformation,
                            status: 200
                        });
                    });
            }
        });

    return res.sendStatus(200);
});

// Error handler Middleware
app.use(errorHandler);
// Run PORT for server connection
const PORT = process.env.PORT || 3000;
// Listen for the port
app.listen(PORT, () => console.log(`Running on port ${PORT} - ${NODE_ENV} `.blue));

process.on('unhandledRejection', (error, _) => console.log(`Server Error: ${error.message} `.red));

/*
username: juinnecwid@ecwid.com,
password: 123456,
service id: 619c97262114cc007432f3aa
api: cf123f1d-fa1d-4f72-a83e-f8cbf1aa1907
https://droppergroup.co.za/droppa/developers-portal > dashboard>
*/