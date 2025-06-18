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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
const cashfree_pg_1 = require("cashfree-pg");
const cashfree = new cashfree_pg_1.Cashfree(cashfree_pg_1.CFEnvironment.SANDBOX, process.env.CASHFREE_CLIENT_ID, process.env.CASHFREE_CLIENT_SECRET);
function createOrder(userId, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        var request = {
            order_amount: amount,
            order_currency: "INR",
            customer_details: {
                customer_id: userId.split('|')[1],
                customer_name: "Test User",
                customer_email: "example@gmail.com",
                customer_phone: "9999999999",
            },
            order_meta: {
                return_url: "https://dev.hypestock.local/home/payment",
            },
            order_note: "Demo order"
        };
        try {
            const response = yield cashfree.PGCreateOrder(request)
                .catch(error => {
                throw error;
            });
            return response.data;
        }
        catch (error) {
            console.error(error.response.data);
            throw error;
        }
    });
}
