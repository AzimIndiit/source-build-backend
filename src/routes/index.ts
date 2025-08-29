import { Router } from 'express';
import v1Routes from './v1/index.js';
// Future API versions can be imported here
// import v2Routes from './v2/index.js';

const router = Router();

// Mount API versions
router.use('/v1', v1Routes);
// router.use('/v2', v2Routes); // Future version

// Root API endpoint
router.get('/', (_req, res) => {
  res.json({
    status: 'success',
    message: 'Source Build API',
    versions: {
      v1: {
        path: '/api/v1',
        status: 'stable',
        documentation: '/api-docs',
      },
      // v2: {
      //   path: '/api/v2',
      //   status: 'beta',
      //   documentation: '/api-docs/v2',
      // },
    },
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

export default router;