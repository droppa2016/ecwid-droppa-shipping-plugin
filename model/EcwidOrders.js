const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ecwidOrderSchema = new Schema({
    serviceId: {
        type: String,
        required: true,
        index: true
    },
    ecwid_store_id: {
        type: String
    },
    droppa_booking_oid: {
        type: String,
        unique: true,
        sparse: true
    },
    droppa_tracknumber: {
        type: String,
        unique: true,
        sparse: true
    },
    droppa_booking_type: {
        type: String
    },
    ecwid_order_id: {
        type: String,
        unique: true,
    }
},
    { timestamps: true }
);

module.exports = mongoose.model('EcwidOrder', ecwidOrderSchema)