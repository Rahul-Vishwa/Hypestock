"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureOrder = exports.createOrder = void 0;
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const paypal_server_sdk_1 = require("@paypal/paypal-server-sdk");
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, } = process.env;
const client = new paypal_server_sdk_1.Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
    },
    timeout: 0,
    environment: paypal_server_sdk_1.Environment.Sandbox,
    logging: {
        logLevel: paypal_server_sdk_1.LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});
const ordersController = new paypal_server_sdk_1.OrdersController(client);
const paymentsController = new paypal_server_sdk_1.PaymentsController(client);
/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = (amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = {
            intent: paypal_server_sdk_1.CheckoutPaymentIntent.Capture,
            purchaseUnits: [
                {
                    amount: {
                        currencyCode: "USD",
                        value: amount,
                        breakdown: {
                            itemTotal: {
                                currencyCode: "USD",
                                value: amount,
                            },
                        },
                    },
                    items: [
                        {
                            name: "Add Balance",
                            quantity: '1',
                            unitAmount: {
                                currencyCode: "USD",
                                value: amount,
                            },
                        },
                    ],
                },
            ],
        };
        const _a = yield ordersController.createOrder({
            body: request,
            prefer: "return=minimal"
        }), { body } = _a, httpResponse = __rest(_a, ["body"]);
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: body,
            httpStatusCode: httpResponse.statusCode,
        };
    }
    catch (error) {
        if (error instanceof paypal_server_sdk_1.ApiError) {
            console.error(error.body);
            throw new Error(error.message);
        }
    }
});
exports.createOrder = createOrder;
// // createOrder route
// app.post("/api/orders", async (req, res) => {
//     try {
//         // use the cart information passed from the front-end to calculate the order amount detals
//         const { cart } = req.body;
//         const { jsonResponse, httpStatusCode } = await createOrder(cart);
//         res.status(httpStatusCode).json(jsonResponse);
//     } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to create order." });
//     }
// });
/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = (paymentID) => __awaiter(void 0, void 0, void 0, function* () {
    const collect = {
        id: paymentID,
        prefer: "return=minimal",
    };
    try {
        const _a = yield ordersController.captureOrder(collect), { body } = _a, httpResponse = __rest(_a, ["body"]);
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: body,
            httpStatusCode: httpResponse.statusCode,
        };
    }
    catch (error) {
        if (error instanceof paypal_server_sdk_1.ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
});
exports.captureOrder = captureOrder;
// captureOrder route
// app.post("/api/orders/:orderID/capture", async (req, res) => {
//     try {
//         const { orderID } = req.params;
//         const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
//         res.status(httpStatusCode).json(jsonResponse);
//     } catch (error) {
//         console.error("Failed to create order:", error);
//         res.status(500).json({ error: "Failed to capture order." });
//     }
// });
