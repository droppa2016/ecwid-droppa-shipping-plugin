const axios = require('axios');

/**
 * @description - Display the Ecwid User's Store's information
 * @param {Get Store ID} store_id
 * @param {Get Store Public Token} public_token ?
 * @returns Object
 */
// async function getUserStorage() {

//     EcwidApp.getAppStorage(function (allKeys) {
//         // prints an array of key : value objects from app storage
//         console.log(allKeys);
//         return allKeys
//     });
// }

async function storeProfileInformation(store_id, public_token) {

    return await getData(`https://app.ecwid.com/api/v3/${store_id}/profile?token=${public_token}`)
        .then(jsonOutput => {
            return jsonOutput;
        })
        .catch(error => console.log({ error }));
}
/**
 * @description - Retrieves the current loaded cart information
 * @param {Get Store ID} store_id
 * @param {Get Cart ID} cart_id
 * @param {Get Token ID} seret_token
 * @returns Object
 */
async function getCurrentCartDetails(store_id, cart_id, seret_token) {

    return await getData(`https://app.ecwid.com/api/v3/${store_id}/carts/${cart_id}?token=${seret_token}`)
        .then(jsonOutput => {
            return jsonOutput;
        })
        .catch(error => console.log({ error }));
}
/**
 * @description - Retrieves the current loaded order information
 * @param {Get Store ID} store_id
 * @param {Get Cart ID} cart_id
 * @param {Get Token ID} seret_token
 * @returns Object
 */
async function getCurrentOrderDetails(store_id, order_id, seret_token) {

    return await getData(`https://app.ecwid.com/api/v3/${store_id}/orders/${order_id}?token=${seret_token}`)
        .then(jsonOutput => {
            return jsonOutput;
        })
        .catch(error => console.log({ error }));
}
/**
 * @description - Generates a quation based on the nested variables
 * @param {Get all product's weight} productWeight
 */
async function droppa_get_quote(res, weight) {

    let rateBodyObject = { mass: weight, dimensions: new Array() }

    rateBodyObject.mass = weight;

    rateBodyObject.dimensions.push({
        parcel_length: 0,
        parcel_breadth: 0,
        parcel_height: 0,
        parcel_mass: weight
    });

    return await postData(process.env.DROPPA_MASS_PRICES, rateBodyObject)
        .then(jsonOutput => {
            return jsonOutput
        })
        .catch(error => console.log(error))
};

async function droppa_get_quote_new_rates(res, weight) {

    let rateBodyObject = { mass: weight, dimensions: new Array() }

    rateBodyObject.mass = weight;

    let data = {
        mass: 30,
        platform: 'ECWID',
        distance: 0,
        InsuranceAmount: 0,
        fromSuburb: res.body.cart.shippingAddress.city,
        toSuburb: 'CENTURION',
        pickUpProvince: 'GAUTENG',
        dropOffProvince: 'GAUTENG',
        pickUpAddress: '8 Bauhinia Street, Highveld Technopark',
        dropOffAddress: '13 Thami Mnyele Drive',
        pickUpPCode: '0169',
        dropOffPCode: '0157',
        parcelDimensions: [
          {
            parcel_length: 0,
            parcel_breadth: 0,
            parcel_height: 0,
            parcel_mass: 30
          }
        ]
    }

    return await postData(process.env.DROPPA_MASS_PRICES_SKYNET, data)
        .then(jsonOutput => {
            return jsonOutput
        })
        .catch(error => console.log(error))
};






/**
 * Get suburbs based on the postal code
 * @param {*} postalCode 
 * @returns 
 */
async function getCorrectSuburbName(postalCode) {
    return await getData(`${process.env.DROPPA_POSTAL_SUBURB}${postalCode}`)
        .then(jsonOutput => {
            return jsonOutput
        })
        .catch(error => console.log(error))
}
/**
 * @description - Create bookings based on the object body given
 * @param {Get the Booking Body from the Post Http generated by Ecwid Order} bookingBody
 */
async function droppa_post_booking(bookingBody) {
    console.log("============inside post service");
    return await postData(process.env.DROPPA_BOOKING, bookingBody)
        .then(jsonOutput => {
            console.log("============success data post service", jsonOutput);
            return jsonOutput;
        })
        .catch(error => console.log("============Error data post service",error));
}

/**
 * @description - Create bookings based on the object body given
 * @param {ready booking for shippment create waybill} bookingId
 */
 async function postReadyForShipment(bookingId) {
    console.log("============inside post service");
    return await postData(`${process.env.DROPPA_BOOKING_SHIPMENT}${bookingId}`)
        .then(jsonOutput => {
            console.log("============success data post service", jsonOutput);
            return jsonOutput;
        })
        .catch(error => console.log("============Error data post service",error));
}
/**
 * @description - Create Payment based on the completed booking
 * @param {Get the Payment Body from the Post Http generated by Ecwid Order} bookingObjectId
 */
async function droppa_post_payment(bookingObjectId) {

    return await postData(`${process.env.DROPPA_CONFIRM}${bookingObjectId}`, null)
        .then(jsonOutput => {
            return jsonOutput;
        })
        .catch(error => console.log(error));
}

async function postData(url = '', data = {}) {

    return await axios({
        url: url,
        method: "POST",
        responseType: "JSON",
        headers: {
            "Content-Type": 'application/json',
            "Accept-Encoding": 'gzip',
            "Authorization": process.env.DROPPA_OAUTH,
        },
        data: JSON.stringify(data)
    })
        .then((response) => {
            return response
        })
        .catch((errorCaught) => console.log({ Error: errorCaught.response.data }));
}

async function getData(url = '') {

    return await axios({
        url: url,
        method: "GET",
        responseType: "JSON",
        headers: {
            "Content-Type": 'application/json',
            "Accept-Encoding": 'gzip'
        }
    })
        .then((response) => {
            return response
        })
        .catch((errorCaught) => console.log({ Error: errorCaught.response.data }));
}

module.exports = {
    storeProfileInformation,
    droppa_get_quote,
    droppa_post_booking,
    getCurrentCartDetails,
    getCurrentOrderDetails,
    getCorrectSuburbName,
    droppa_post_payment,
    postReadyForShipment,
    droppa_get_quote_new_rates
}