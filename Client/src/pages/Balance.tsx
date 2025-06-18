// @ts-ignore
import { load } from "@cashfreepayments/cashfree-js";
import api from "../api/axios";
import { useEffect, useReducer, useRef, useState } from "react";

export default function Balance() {
  const [balance, setBalance] = useState(0);
  const [addBalance, setAddBalance] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  let cashfree:any;
  var initializeSDK = async function () {
    cashfree = await load({
      mode: "sandbox",
    });
  };
  initializeSDK();

  useEffect(() => {
    api.get<{ balance: number }>('/balance')
      .then(res => {
        setBalance(res.data.balance);
      })
      .catch(error => {
        console.log(error);
      });
  }, []);

  const doPayment = async () => {
    const { data } = await api.post<{ payment_session_id: string, paymentId: string }>('/balance/createOrder', {
      amount: addBalance
    });
    let checkoutOptions = {
      paymentSessionId: data.payment_session_id,
      redirectTarget: "_modal",
    };
    cashfree.checkout(checkoutOptions).then(async (result: any) => {
      if (result.error) {
        console.log("User has closed the popup or there is some payment error, Check for Payment Status");
        console.log(result.error);
      }
      if (result.redirect) {
        console.log("Payment will be redirected");
      }
      if (result.paymentDetails) {
        console.log(result);
        api.post<{ balance: number }>('/balance', {
          amount: addBalance,
          paymentId: data.paymentId
        })
        .then(res => {
          setBalance(res.data.balance);
          inputRef.current!.value = ''; 
        })
        .catch(error => {
          console.log(error);
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-5 items-start">
      <div className="text-2xl font-bold">
        Balance
      </div>
      <div className="bg-secondary text-xl w-[500px] text-center rounded-md p-10 py-24">
        Rs. {balance}
      </div>
      <div className="flex w-[500px] justify-between gap-10">
        <div>
          <input 
            type="number" 
            id="balance" 
            onChange={(e) => setAddBalance(e.target.value)} 
            className="py-2 px-3 text-black rounded-sm outline-none" 
            ref={inputRef}
          />
        </div>
        <button 
          id="renderBtn" 
          type="submit"
          disabled={!addBalance} 
          className={`bg-white text-black px-5 py-2 w-full rounded-sm ${!addBalance && 'bg-secondary cursor-not-allowed'}`} 
          onClick={doPayment}
        >
          Add Balance
        </button>
      </div>
    </div>
  );
}