/**
 * User-Plant Map Routes
 * API endpoints for managing user-plant assignments
 */

import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as userPlantMapController from '../controllers/userPlantMapController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin-only routes for managing assignments
router.post('/assign', restrictTo('ADMIN'), userPlantMapController.assignPlantsToUser);
router.post('/remove', restrictTo('ADMIN'), userPlantMapController.removePlantsFromUser);
router.post('/bulk-assign', restrictTo('ADMIN'), userPlantMapController.bulkAssign);

// Get assignments
router.get('/plant/:plantId/users', userPlantMapController.getUsersForPlant);
router.get('/user/:userId/plants', userPlantMapController.getPlantsForUser);

export default router;
