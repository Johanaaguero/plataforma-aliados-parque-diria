import { Router } from 'express';
import { login } from './login.controller';

const router = Router();

router.post('/login', login);

export default router;