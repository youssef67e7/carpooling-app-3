import crypto from "crypto";
import { Router } from "express";
import { body, param, query } from "express-validator";
import { WalletAccount, WALLET_TYPES } from "../models/WalletAccount.js";
import { Transaction } from "../models/Transaction.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { User } from "../models/User.js";
import { authRequired, blockCheck, roleRequired } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.use(authRequired, blockCheck, roleRequired("passenger", "driver"));

function hashOtp(otp) {
  const secret = process.env.WITHDRAW_OTP_SECRET || "dev-withdraw-secret-change-me";
  return crypto.createHash("sha256").update(`${otp}:${secret}`).digest("hex");
}

function randomOtp6() {
  return String(crypto.randomInt(100000, 1000000));
}

router.get("/accounts", async (req, res, next) => {
  try {
    const accounts = await WalletAccount.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    const totalBalance = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
    return res.json({ accounts, totalBalance: Math.round(totalBalance * 100) / 100 });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/accounts",
  body("walletType").isIn(WALLET_TYPES),
  body("phoneNumber").optional().trim().isLength({ max: 32 }),
  body("label").optional().trim().isLength({ max: 80 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { walletType, phoneNumber, label } = req.body;
      const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";
      if (walletType !== "cash" && !phone) {
        throw new AppError("phoneNumber required for this wallet type", 400);
      }
      const acc = await WalletAccount.create({
        userId: req.userId,
        walletType,
        phoneNumber: phone,
        label: typeof label === "string" ? label.trim().slice(0, 80) : "",
        balance: 0,
      });
      return res.status(201).json({ account: acc.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/accounts/:id", param("id").isMongoId(), validateRequest, async (req, res, next) => {
  try {
    const acc = await WalletAccount.findOne({ _id: req.params.id, userId: req.userId });
    if (!acc) throw new AppError("Not found", 404);
    if (Number(acc.balance) > 0) throw new AppError("Withdraw balance before removing wallet", 400);
    await acc.deleteOne();
    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Mock top-up — credits balance (no real PSP). */
router.post(
  "/deposit",
  body("walletAccountId").isMongoId(),
  body("amount").isFloat({ gt: 0, max: 50000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { walletAccountId, amount } = req.body;
      const acc = await WalletAccount.findOne({ _id: walletAccountId, userId: req.userId });
      if (!acc) throw new AppError("Wallet not found", 404);
      const amt = Math.round(Number(amount) * 100) / 100;
      acc.balance = Math.round((Number(acc.balance) + amt) * 100) / 100;
      await acc.save();
      const tx = await Transaction.create({
        userId: req.userId,
        walletAccountId: acc._id,
        amount: amt,
        type: "deposit",
        status: "success",
        note: "Simulated deposit",
      });
      return res.json({ account: acc.toJSON(), transaction: tx.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/withdraw/request",
  body("walletAccountId").isMongoId(),
  body("amount").isFloat({ gt: 0, max: 50000 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { walletAccountId, amount } = req.body;
      const acc = await WalletAccount.findOne({ _id: walletAccountId, userId: req.userId });
      if (!acc) throw new AppError("Wallet not found", 404);
      const amt = Math.round(Number(amount) * 100) / 100;
      if (Number(acc.balance) < amt) throw new AppError("Insufficient balance", 400);

      await WithdrawalRequest.updateMany(
        { userId: req.userId, status: "pending", expiresAt: { $gt: new Date() } },
        { $set: { status: "expired" } }
      );

      const otp = randomOtp6();
      const digest = hashOtp(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const wr = await WithdrawalRequest.create({
        userId: req.userId,
        walletAccountId: acc._id,
        amount: amt,
        otpDigest: digest,
        expiresAt,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(`[wallet] Simulated withdraw OTP for ${req.user.email || req.userId}: ${otp} (request ${wr._id})`);
      }

      return res.status(201).json({
        requestId: wr._id.toString(),
        expiresAt: expiresAt.toISOString(),
        message: "Confirmation code sent (simulated). Check server logs in development.",
        _devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/withdraw/confirm",
  body("requestId").isMongoId(),
  body("otp").isLength({ min: 4, max: 8 }),
  validateRequest,
  async (req, res, next) => {
    try {
      const { requestId, otp } = req.body;
      const wr = await WithdrawalRequest.findOne({
        _id: requestId,
        userId: req.userId,
        status: "pending",
      });
      if (!wr) throw new AppError("Request not found", 404);
      if (wr.expiresAt < new Date()) {
        wr.status = "expired";
        await wr.save();
        throw new AppError("Code expired", 400);
      }
      if (hashOtp(String(otp).trim()) !== wr.otpDigest) {
        throw new AppError("Invalid code", 400);
      }

      const acc = await WalletAccount.findOne({ _id: wr.walletAccountId, userId: req.userId });
      if (!acc) throw new AppError("Wallet missing", 400);
      if (Number(acc.balance) < wr.amount) {
        wr.status = "failed";
        await wr.save();
        throw new AppError("Insufficient balance", 400);
      }

      acc.balance = Math.round((Number(acc.balance) - wr.amount) * 100) / 100;
      await acc.save();
      wr.status = "completed";
      await wr.save();

      const tx = await Transaction.create({
        userId: req.userId,
        walletAccountId: acc._id,
        amount: wr.amount,
        type: "withdraw",
        status: "success",
        note: "Simulated payout to linked wallet",
      });

      return res.json({ account: acc.toJSON(), transaction: tx.toJSON() });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/transactions", query("limit").optional().isInt({ min: 1, max: 100 }), validateRequest, async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const txs = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("walletAccountId", "walletType phoneNumber label")
      .lean();
    return res.json({ transactions: txs });
  } catch (e) {
    next(e);
  }
});

export default router;
