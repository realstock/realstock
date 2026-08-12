"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ListingType = "COMPRA_VENDA" | "ALUGUEL_TEMPORADA";

type ListingTypeContextType = {
  listingType: ListingType;
  setListingType: (type: ListingType) => void;
  checkInDate: string;
  setCheckInDate: (date: string) => void;
  checkOutDate: string;
  setCheckOutDate: (date: string) => void;
  guestsCount: string;
  setGuestsCount: (guests: string) => void;
};

const ListingTypeContext = createContext<ListingTypeContextType | undefined>(undefined);

export function ListingTypeProvider({ children }: { children: React.ReactNode }) {
  const [listingType, setListingTypeState] = useState<ListingType>("ALUGUEL_TEMPORADA");
  const [checkInDate, setCheckInDateState] = useState<string>("");
  const [checkOutDate, setCheckOutDateState] = useState<string>("");
  const [guestsCount, setGuestsCountState] = useState<string>("1");

  // Carregar dados salvos no localStorage após a montagem do componente no cliente
  useEffect(() => {
    const savedType = localStorage.getItem("realstock_listing_type") as ListingType;
    if (savedType === "COMPRA_VENDA" || savedType === "ALUGUEL_TEMPORADA") {
      setListingTypeState(savedType);
    } else {
      setListingTypeState("ALUGUEL_TEMPORADA");
    }

    const savedCheckIn = localStorage.getItem("realstock_checkin");
    if (savedCheckIn) setCheckInDateState(savedCheckIn);

    const savedCheckOut = localStorage.getItem("realstock_checkout");
    if (savedCheckOut) setCheckOutDateState(savedCheckOut);

    const savedGuests = localStorage.getItem("realstock_guests");
    if (savedGuests) setGuestsCountState(savedGuests);
  }, []);

  const setListingType = (type: ListingType) => {
    setListingTypeState(type);
    localStorage.setItem("realstock_listing_type", type);
  };

  const setCheckInDate = (date: string) => {
    setCheckInDateState(date);
    if (date) {
      localStorage.setItem("realstock_checkin", date);
    } else {
      localStorage.removeItem("realstock_checkin");
    }
  };

  const setCheckOutDate = (date: string) => {
    setCheckOutDateState(date);
    if (date) {
      localStorage.setItem("realstock_checkout", date);
    } else {
      localStorage.removeItem("realstock_checkout");
    }
  };

  const setGuestsCount = (guests: string) => {
    setGuestsCountState(guests);
    if (guests) {
      localStorage.setItem("realstock_guests", guests);
    } else {
      localStorage.removeItem("realstock_guests");
    }
  };

  return (
    <ListingTypeContext.Provider
      value={{
        listingType,
        setListingType,
        checkInDate,
        setCheckInDate,
        checkOutDate,
        setCheckOutDate,
        guestsCount,
        setGuestsCount,
      }}
    >
      {children}
    </ListingTypeContext.Provider>
  );
}

export function useListingType() {
  const context = useContext(ListingTypeContext);
  if (context === undefined) {
    throw new Error("useListingType deve ser usado dentro de um ListingTypeProvider");
  }
  return context;
}
