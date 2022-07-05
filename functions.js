EcwidApp.init({
    app_id: "droppa-app-dev",
    autoloadedflag: true,
    autoheight: true
});

console.log("app loaded......");
let storeData = EcwidApp.getPayload();
let storeId = storeData.store_id;
let accessToken = storeData.access_token;
let publicToken = storeData.public_token;
let language = storeData.lang;
let viewMode = storeData.view_mode;
// const EcwidSettings = require('./model/EcwidSettings');

const initialConfig = {
    private: {
        merchantId: "droppa-app-dev",
        title: "Droppa Shipping DEV",
        APIsecret: accessToken,
        endpointUrl: "https://ecwid-droppa-shipping-plugin.herokuapp.com",
        instructionTitle: "Droppa Shipping Application",
        globalShippingRate: "true",
        enabled: true,
        installed: "yes",
        fulfilmentType: "shipping",
        companyEmail: "Droppa Group",
        aboutBusiness: "Droppa is an on demand delivery service that makes it safer and easier to move office or household goods and furniture. Once you’ve booked a Droppa delivery, you will be able to track your goods throughout the entire journey, from pick up to drop off! Our drivers go through a vigorous screening and training process where all checks are conducted and drivers are taught how to handle goods in transit."
    },
    public: {
        merchantId: "droppa-app-dev",
        title: "Droppa Shipping DEV",
        fulfilmentType: "shipping",
        APIsecret: publicToken,
        endpointUrl: "https://ecwid-droppa-shipping-plugin.herokuapp.com",
        instructionTitle: "Droppa Shipping Application",
        enabled: true,
        installed: "yes"
    }
};
// https://my.ecwid.com/store/58231007#develop-apps
EcwidApp.setAppStorage(accessToken, async (value) => {
    // console.log('Public User Preferences Saved:', value, accessToken, storeData)
});

EcwidApp.setAppPublicConfig(accessToken, () => {
    // console.log('Public app config saved!')
});

EcwidApp.getAppStorage('public', (value) => {
    console.log(`Installed Application: `, value);
});

EcwidApp.getAppStorage('api_key', function (value) {
    let api_key = document.querySelector('#api_key').value;
    console.log("api key is ....", value);
    if (value) {
        document.querySelector('#api_key').value = value;
    } else {
        console.log("no api key");
    }
});

EcwidApp.getAppStorage('service_key', function (value) {
    let service_key = document.querySelector('#service_key').value;
    // console.log("api key is ....",  value);
    if (value) {
        document.querySelector('#service_key').value = value;
    } else {
        console.log("no api key");
    }
});

EcwidApp.getAppStorage('storeName', function (value) {
    let store_name = document.querySelector('#store_name').value;
    console.log("api key is ....", value);
    if (value) {
        document.querySelector('#store_name').value = value;
    } else {
        console.log("no api key");
    }
});

let store_Id = document.getElementById('storeId');
let public_key = document.getElementById('public_key');
let private_key = document.getElementById('private_key');

store_Id.value = storeId;
public_key.value = publicToken;
private_key.value = accessToken;

async function postData(url = '', data = {}) {

    const response = await fetch(url, {
        method: "GET",
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json"
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        // body: JSON.stringify(data) // body data type must match "Content-Type" header
    });

    return response.json();
}

document.getElementById('signup').addEventListener('click', (e) => {
    window.open("https://www.droppergroup.co.za/droppa/retail-Signin");
})

document.getElementById('saveEcwidKeys').addEventListener('click', (e) => {
    e.preventDefault();

    let { api_key,
        service_key,
        store_name,
        errorResultsAPI,
        errorResultsServiceKey,
        errorResultsStoreName,
        errorResultsStoreId,
        updatedKeys
    } = '';

    api_key = document.querySelector('#api_key').value;
    service_key = document.querySelector('#service_key').value;
    store_name = document.querySelector('#store_name').value;
    errorResultsAPI = document.getElementById('errorResultsAPI');
    errorResultsServiceKey = document.getElementById('errorResultsServiceKey');
    errorResultsStoreName = document.getElementById('errorResultsStoreName');
    updatedKeys = document.getElementById('updatedKeys');

    const bodyData = {
        api_key: api_key,
        service_key: service_key,
        storeName: store_name,
        store_Id: `${storeId}`,
        public_key: publicToken,
        private_key: accessToken
    }

    if (api_key.trim() === '') {
        errorResultsAPI.innerHTML = 'Please Fill In The API Key Field.';
        return false;

    } else if (service_key.trim() === '') {
        errorResultsAPI.innerHTML = "";
        errorResultsServiceKey.innerHTML = 'Please Fill In The Service Key Field.';
        return false;

    } else if (store_name.trim() === '') {
        errorResultsServiceKey.innerHTML = "";
        errorResultsStoreName.innerHTML = 'Please Fill In The Store Name Field.';
        return false;

    } else {

        errorResultsStoreName.innerHTML = "";
        EcwidApp.setAppStorage(bodyData, function () {
            console.log('Data saved!');
        });

        EcwidApp.getAppStorage('public', function (value) {
            //prints '1234' 
            console.log(value);
        });

        postData("https://droppergroup.co.za/droppa/services/drops/booking/GAU136965")
            .then(data => {
                if (data.status === 200) {
                    updatedKeys.innerHTML = data.updatedKeys;
                } else {
                    updatedKeys.innerHTML = data.updatedKeys;
                }
            })
            .catch(error => {
                console.log(error.message)
                console.log(error);
            });

        async function postData1(url = '', data = {}) {

            const response = await fetch(url, {
                method: "POST",
                mode: 'cors', // no-cors, *cors, same-origin
                cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                credentials: 'same-origin', // include, *same-origin, omit
                headers: {
                    "Content-Type": "application/json"
                },
                redirect: "follow", // manual, *follow, error
                referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                body: JSON.stringify(data) // body data type must match "Content-Type" header
            });

            return response.json();
        }

        postData1("/save_user_keys", {})
            .then(data => {
                console.log(data);
                if (data.status === 200) {
                    updatedKeys.innerHTML = data.updatedKeys;
                } else {
                    updatedKeys.innerHTML = data.updatedKeys;
                }
            })
            .catch(error => {
                console.log(error.message)
                console.log(error);
            });
    }
});