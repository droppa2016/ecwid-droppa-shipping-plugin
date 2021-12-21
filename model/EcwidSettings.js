const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ecwidSettingsSchema = new Schema({
    api_key: {
        type: String,
        required: false
    },
    service_key: {
        type: String,
        required: false
    },
    storeName: {
        type: String,
        required: false
    },
    store_Id: {
        type: String,
        required: false
    },
    public_key: {
        type: String,
        required: false
    },
    private_key: {
        type: String,
        required: false
    }
},
    { timestamps: true }
);

module.exports = mongoose.model('EcwidSetting', ecwidSettingsSchema)