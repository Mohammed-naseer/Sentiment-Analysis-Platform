"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = require("mongoose");
const ProductSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        index: true,
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        trim: true,
        default: 'General',
        index: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    price: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 1.0,
        max: 5.0,
    },
    reviewsCount: {
        type: Number,
        default: 0,
    },
    positivePercentage: {
        type: Number,
        default: 100,
    },
    negativePercentage: {
        type: Number,
        default: 0,
    },
    neutralPercentage: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});
exports.Product = (0, mongoose_1.model)('Product', ProductSchema);
exports.default = exports.Product;
