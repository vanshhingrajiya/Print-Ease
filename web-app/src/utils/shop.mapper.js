export const mapShopToFormValues = (shop) => {
  return {
    shopName: shop.shopName || '',
    ownerName: shop.ownerName || '',
    description: shop.description || '',

    address: {
      shopNumber: shop.address?.shopNumber || '',
      street: shop.address?.street || '',
      city: shop.address?.city || '',
      state: shop.address?.state || '',
      pincode: shop.address?.pincode || ''
    },

    contactInfo: {
      phone: shop.contactInfo?.phone || '',
      email: shop.contactInfo?.email || ''
    },

    upi: {
      id: shop.upi?.id || '',
      displayName: shop.upi?.displayName || ''
    },

    printingServices: {
      blackWhite: {
        singleSidedPrice:
          shop.printingServices?.blackWhite?.singleSidedPrice ?? 0,
        doubleSidedPrice:
          shop.printingServices?.blackWhite?.doubleSidedPrice ?? 0
      },
      color: {
        singleSidedPrice:
          shop.printingServices?.color?.singleSidedPrice ?? 0,
        doubleSidedPrice:
          shop.printingServices?.color?.doubleSidedPrice ?? 0
      }
    },

    location: {
      lat: shop.location?.coordinates?.[1] ?? null,
      lng: shop.location?.coordinates?.[0] ?? null
    }
  };
};