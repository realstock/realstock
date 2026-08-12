"use client";

import { SessionProvider } from "next-auth/react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ListingTypeProvider } from "@/context/ListingTypeContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
    currency: "BRL",
    intent: "capture",
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <SessionProvider>
        <ListingTypeProvider>
          {children}
        </ListingTypeProvider>
      </SessionProvider>
    </PayPalScriptProvider>
  );
}