import { Cashfree, CFEnvironment, CreateOrderRequest } from "cashfree-pg";

const cashfree = new Cashfree(
	CFEnvironment.SANDBOX,
	process.env.CASHFREE_CLIENT_ID,
	process.env.CASHFREE_CLIENT_SECRET,
);

export async function createOrder(userId: string, orderId: string, amount: number) {
	var request: CreateOrderRequest = {
		order_amount: amount,
		order_currency: "INR",
		customer_details: {
		  customer_id: userId.split('|')[1],
		  customer_name: "Test User", 
		  customer_email: "example@gmail.com", 
		  customer_phone: "9999999999",
		},
		order_note: "Demo order"
	};
	  
	try {
		const response = await cashfree.PGCreateOrder(request)
		.catch(error => {
			throw error;
		});
		return response.data;
	}
	catch (error: any) {
		console.error(error.response.data);
		throw error;
	}
}