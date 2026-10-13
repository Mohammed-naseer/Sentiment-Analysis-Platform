import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Analysis } from '../models/Analysis';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * List all products (with optional search/filter)
 * GET /api/products
 */
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, sort } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (q?.trim()) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }
    if (category && category !== 'All') {
      filter.category = category;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      reviews: { reviewsCount: -1 },
      rating: { rating: -1 },
      positive: { positivePercentage: -1 },
      newest: { createdAt: -1 },
    };
    const sortOrder = sortMap[sort || 'newest'] || { createdAt: -1 };

    const products = await Product.find(filter)
      .sort(sortOrder)
      .populate('createdBy', 'name email');

    sendSuccess(res, 'Products retrieved successfully.', { products });
  } catch (error: any) {
    logger.error('[ProductController] Get products failed:', error.message);
    sendError(res, 'Failed to retrieve products.', error.message, 500);
  }
};

/**
 * Get a single product by ID
 * GET /api/products/:id
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate('createdBy', 'name email');
    if (!product) {
      sendError(res, 'Product not found.', 'ProductNotFoundError', 404);
      return;
    }
    sendSuccess(res, 'Product retrieved successfully.', { product });
  } catch (error: any) {
    logger.error('[ProductController] Get product by id failed:', error.message);
    sendError(res, 'Failed to retrieve product.', error.message, 500);
  }
};

/**
 * Create a new product
 * POST /api/products
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  const { name, category, description, price, currency } = req.body;

  if (!name?.trim()) {
    sendError(res, 'Product name is required.', 'ValidationError', 400);
    return;
  }
  if (!category?.trim()) {
    sendError(res, 'Product category is required.', 'ValidationError', 400);
    return;
  }

  try {
    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || '',
      price: Number(price) || 0,
      currency: currency || 'INR',
      createdBy: req.user!._id,
    });

    logger.info(`[ProductController] Product created: ${product.name} by ${req.user!.email}`);
    sendSuccess(res, 'Product created successfully.', { product }, 201);
  } catch (error: any) {
    logger.error('[ProductController] Create product failed:', error.message);
    sendError(res, 'Failed to create product.', error.message, 500);
  }
};

/**
 * Update a product
 * PUT /api/products/:id
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { name, category, description, price, currency } = req.body;

  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'Product not found.', 'ProductNotFoundError', 404);
      return;
    }

    if (name?.trim()) product.name = name.trim();
    if (category?.trim()) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (price !== undefined) product.price = Number(price);
    if (currency) product.currency = currency;

    await product.save();
    logger.info(`[ProductController] Product updated: ${product.name}`);
    sendSuccess(res, 'Product updated successfully.', { product });
  } catch (error: any) {
    logger.error('[ProductController] Update product failed:', error.message);
    sendError(res, 'Failed to update product.', error.message, 500);
  }
};

/**
 * Delete a product (Admin only)
 * DELETE /api/products/:id
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      sendError(res, 'Product not found.', 'ProductNotFoundError', 404);
      return;
    }
    logger.info(`[ProductController] Product deleted: ${product.name} by ${req.user!.email}`);
    sendSuccess(res, `Product "${product.name}" deleted successfully.`, { id: req.params.id });
  } catch (error: any) {
    logger.error('[ProductController] Delete product failed:', error.message);
    sendError(res, 'Failed to delete product.', error.message, 500);
  }
};

/**
 * Get product sentiment stats (from linked Analysis records)
 * GET /api/products/:id/stats
 */
export const getProductStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      sendError(res, 'Product not found.', 'ProductNotFoundError', 404);
      return;
    }

    // Aggregate sentiment from analyses linked to this product
    const analyses = await Analysis.find({ productId: req.params.id });
    const total = analyses.length;

    if (total === 0) {
      sendSuccess(res, 'No analyses found for this product.', {
        product,
        stats: { total: 0, positive: 0, negative: 0, neutral: 0, positivePercentage: 0, negativePercentage: 0, neutralPercentage: 0 }
      });
      return;
    }

    const sentimentCounts = analyses.reduce((acc, a) => {
      const s = (a as any).sentiment?.toLowerCase() || 'neutral';
      if (s === 'positive') acc.positive++;
      else if (s === 'negative') acc.negative++;
      else acc.neutral++;
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

    sendSuccess(res, 'Product stats retrieved successfully.', { product, stats });
  } catch (error: any) {
    logger.error('[ProductController] Get product stats failed:', error.message);
    sendError(res, 'Failed to retrieve product stats.', error.message, 500);
  }
};
