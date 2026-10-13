"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductStats = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getProducts = void 0;
const Product_1 = require("../models/Product");
const Analysis_1 = require("../models/Analysis");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * List all products (with optional search/filter)
 * GET /api/products
 */
const getProducts = async (req, res) => {
    try {
        const { q, category, sort } = req.query;
        const filter = {};
        if (q?.trim()) {
            filter.name = { $regex: q.trim(), $options: 'i' };
        }
        if (category && category !== 'All') {
            filter.category = category;
        }
        const sortMap = {
            reviews: { reviewsCount: -1 },
            rating: { rating: -1 },
            positive: { positivePercentage: -1 },
            newest: { createdAt: -1 },
        };
        const sortOrder = sortMap[sort || 'newest'] || { createdAt: -1 };
        const products = await Product_1.Product.find(filter)
            .sort(sortOrder)
            .populate('createdBy', 'name email');
        (0, response_1.sendSuccess)(res, 'Products retrieved successfully.', { products });
    }
    catch (error) {
        logger_1.default.error('[ProductController] Get products failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve products.', error.message, 500);
    }
};
exports.getProducts = getProducts;
/**
 * Get a single product by ID
 * GET /api/products/:id
 */
const getProductById = async (req, res) => {
    try {
        const product = await Product_1.Product.findById(req.params.id).populate('createdBy', 'name email');
        if (!product) {
            (0, response_1.sendError)(res, 'Product not found.', 'ProductNotFoundError', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, 'Product retrieved successfully.', { product });
    }
    catch (error) {
        logger_1.default.error('[ProductController] Get product by id failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve product.', error.message, 500);
    }
};
exports.getProductById = getProductById;
/**
 * Create a new product
 * POST /api/products
 */
const createProduct = async (req, res) => {
    const { name, category, description, price, currency } = req.body;
    if (!name?.trim()) {
        (0, response_1.sendError)(res, 'Product name is required.', 'ValidationError', 400);
        return;
    }
    if (!category?.trim()) {
        (0, response_1.sendError)(res, 'Product category is required.', 'ValidationError', 400);
        return;
    }
    try {
        const product = await Product_1.Product.create({
            name: name.trim(),
            category: category.trim(),
            description: description?.trim() || '',
            price: Number(price) || 0,
            currency: currency || 'INR',
            createdBy: req.user._id,
        });
        logger_1.default.info(`[ProductController] Product created: ${product.name} by ${req.user.email}`);
        (0, response_1.sendSuccess)(res, 'Product created successfully.', { product }, 201);
    }
    catch (error) {
        logger_1.default.error('[ProductController] Create product failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to create product.', error.message, 500);
    }
};
exports.createProduct = createProduct;
/**
 * Update a product
 * PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
    const { name, category, description, price, currency } = req.body;
    try {
        const product = await Product_1.Product.findById(req.params.id);
        if (!product) {
            (0, response_1.sendError)(res, 'Product not found.', 'ProductNotFoundError', 404);
            return;
        }
        if (name?.trim())
            product.name = name.trim();
        if (category?.trim())
            product.category = category.trim();
        if (description !== undefined)
            product.description = description.trim();
        if (price !== undefined)
            product.price = Number(price);
        if (currency)
            product.currency = currency;
        await product.save();
        logger_1.default.info(`[ProductController] Product updated: ${product.name}`);
        (0, response_1.sendSuccess)(res, 'Product updated successfully.', { product });
    }
    catch (error) {
        logger_1.default.error('[ProductController] Update product failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to update product.', error.message, 500);
    }
};
exports.updateProduct = updateProduct;
/**
 * Delete a product (Admin only)
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
    try {
        const product = await Product_1.Product.findByIdAndDelete(req.params.id);
        if (!product) {
            (0, response_1.sendError)(res, 'Product not found.', 'ProductNotFoundError', 404);
            return;
        }
        logger_1.default.info(`[ProductController] Product deleted: ${product.name} by ${req.user.email}`);
        (0, response_1.sendSuccess)(res, `Product "${product.name}" deleted successfully.`, { id: req.params.id });
    }
    catch (error) {
        logger_1.default.error('[ProductController] Delete product failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to delete product.', error.message, 500);
    }
};
exports.deleteProduct = deleteProduct;
/**
 * Get product sentiment stats (from linked Analysis records)
 * GET /api/products/:id/stats
 */
const getProductStats = async (req, res) => {
    try {
        const product = await Product_1.Product.findById(req.params.id);
        if (!product) {
            (0, response_1.sendError)(res, 'Product not found.', 'ProductNotFoundError', 404);
            return;
        }
        // Aggregate sentiment from analyses linked to this product
        const analyses = await Analysis_1.Analysis.find({ productId: req.params.id });
        const total = analyses.length;
        if (total === 0) {
            (0, response_1.sendSuccess)(res, 'No analyses found for this product.', {
                product,
                stats: { total: 0, positive: 0, negative: 0, neutral: 0, positivePercentage: 0, negativePercentage: 0, neutralPercentage: 0 }
            });
            return;
        }
        const sentimentCounts = analyses.reduce((acc, a) => {
            const s = a.sentiment?.toLowerCase() || 'neutral';
            if (s === 'positive')
                acc.positive++;
            else if (s === 'negative')
                acc.negative++;
            else
                acc.neutral++;
            return acc;
        }, { positive: 0, negative: 0, neutral: 0 });
        const stats = {
            total,
            ...sentimentCounts,
            positivePercentage: Math.round((sentimentCounts.positive / total) * 100),
            negativePercentage: Math.round((sentimentCounts.negative / total) * 100),
            neutralPercentage: Math.round((sentimentCounts.neutral / total) * 100),
        };
        // Update denormalized counters on the product
        product.positivePercentage = stats.positivePercentage;
        product.negativePercentage = stats.negativePercentage;
        product.neutralPercentage = stats.neutralPercentage;
        product.reviewsCount = total;
        await product.save();
        (0, response_1.sendSuccess)(res, 'Product stats retrieved successfully.', { product, stats });
    }
    catch (error) {
        logger_1.default.error('[ProductController] Get product stats failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve product stats.', error.message, 500);
    }
};
exports.getProductStats = getProductStats;
