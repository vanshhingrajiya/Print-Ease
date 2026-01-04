import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { roundCoord } from '../utils/geo.utils';

import {
  createShop,
  updateShop,
  getMyShops
} from '../services/shop.service';

import { mapShopToFormValues } from '../utils/shop.mapper';
import LocationSection from '../components/LocationSection';

const defaultValues = {
  shopName: '',
  ownerName: '',
  description: '',

  address: {
    shopNumber: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  },

  contactInfo: {
    phone: '',
    email: ''
  },

  upi: {
    id: '',
    displayName: ''
  },

  printingServices: {
    blackWhite: { singleSidedPrice: 0, doubleSidedPrice: 0 },
    color: { singleSidedPrice: 0, doubleSidedPrice: 0 }
  },

  workingHours: {
    monday:    { isOpen: true,  open: '09:00', close: '21:00' },
    tuesday:   { isOpen: true,  open: '09:00', close: '21:00' },
    wednesday: { isOpen: true,  open: '09:00', close: '21:00' },
    thursday:  { isOpen: true,  open: '09:00', close: '21:00' },
    friday:    { isOpen: true,  open: '09:00', close: '21:00' },
    saturday:  { isOpen: true,  open: '09:00', close: '21:00' },
    sunday:    { isOpen: false, open: '',      close: '' }
  },

  location: { lat: null, lng: null }
};

const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100';

export default function ShopSetup() {
  const [shopId, setShopId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  const { register, handleSubmit, reset, watch, setValue } =
    useForm({ defaultValues });

  const lat = watch('location.lat');
  const lng = watch('location.lng');

  const loadShop = async () => {
    try {
      const res = await getMyShops();
      const shops = res.data || [];

      if (shops.length > 0) {
        const shop = shops[0];
        setShopId(shop._id);

        const mapped = mapShopToFormValues(shop);
        reset(mapped);
        setSavedSnapshot(mapped);
      }
    } catch {
      toast.error('Failed to load shop');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShop();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      const { lat, lng } = data.location || {};

      if (lat != null && lng != null) {
        payload.location = {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)]
        };
      } else {
        delete payload.location;
      }

      if (shopId) {
        await updateShop(shopId, payload);
        toast.success('Shop updated');
      } else {
        await createShop(payload);
        toast.success('Shop created');
      }

      setIsEditing(false);
      await loadShop(); // soft refresh
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const cancelEdit = () => {
    reset(savedSnapshot);
    setIsEditing(false);
  };

  if (loading) {
    return <p className="text-center mt-10">Loading…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {shopId ? 'Shop Details' : 'Create Shop'}
        </h1>

        {shopId && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-gray-800 text-white rounded"
          >
            Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* SHOP INFO */}
        <Section title="Shop Information">
          <Field label="Shop Name *">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('shopName')} />
          </Field>

          <Field label="Owner Name *">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('ownerName')} />
          </Field>

          <Field label="Description">
            <textarea className={inputClass} rows={3} disabled={!isEditing && shopId} {...register('description')} />
          </Field>
        </Section>

        {/* ADDRESS */}
        <Section title="Address">
          {[
            ['Shop / Flat Number', 'address.shopNumber'],
            ['Street', 'address.street'],
            ['City *', 'address.city'],
            ['State *', 'address.state'],
            ['Pincode *', 'address.pincode']
          ].map(([label, name]) => (
            <Field key={name} label={label}>
              <input className={inputClass} disabled={!isEditing && shopId} {...register(name)} />
            </Field>
          ))}
        </Section>

        {/* CONTACT */}
        <Section title="Contact Information">
          <Field label="Phone *">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('contactInfo.phone')} />
          </Field>

          <Field label="Email">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('contactInfo.email')} />
          </Field>
        </Section>

        <Section title="Printing Prices (₹)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="B/W Single Sided (per page)">
              <input
                type="number"
                min="0"
                className={inputClass}
                disabled={!isEditing && shopId}
                {...register('printingServices.blackWhite.singleSidedPrice')}
              />
            </Field>

            <Field label="B/W Double Sided (per page)">
              <input
                type="number"
                min="0"
                className={inputClass}
                disabled={!isEditing && shopId}
                {...register('printingServices.blackWhite.doubleSidedPrice')}
              />
            </Field>

            <Field label="Color Single Sided (per page)">
              <input
                type="number"
                min="0"
                className={inputClass}
                disabled={!isEditing && shopId}
                {...register('printingServices.color.singleSidedPrice')}
              />
            </Field>

            <Field label="Color Double Sided (per page)">
              <input
                type="number"
                min="0"
                className={inputClass}
                disabled={!isEditing && shopId}
                {...register('printingServices.color.doubleSidedPrice')}
              />
            </Field>
          </div>
        </Section>


        {/* UPI */}
        <Section title="UPI Details">
          <Field label="UPI ID">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('upi.id')} />
          </Field>

          <Field label="Display Name">
            <input className={inputClass} disabled={!isEditing && shopId} {...register('upi.displayName')} />
          </Field>
        </Section>

        {/* LOCATION */}
        <Section title="Shop Location">
          <LocationSection
            lat={lat}
            lng={lng}
            isEditing={isEditing || !shopId}
            onChange={(lat, lng) => {
              setValue('location.lat', roundCoord(lat));
              setValue('location.lng', roundCoord(lng));
            }}
            />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude">
              <input type="number" step="0.000001" className={inputClass} disabled={!isEditing && shopId} {...register('location.lat')} />
            </Field>

            <Field label="Longitude">
              <input type="number" step="0.000001" className={inputClass} disabled={!isEditing && shopId} {...register('location.lng')} />
            </Field>
          </div>
        </Section>

        {/* WORKING HOURS */}
        <Section title="Working Hours">
          <div className="space-y-4">
            {[
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday'
            ].map((day) => (
              <div
                key={day}
                className="grid grid-cols-4 gap-4 items-center"
              >
                <span className="capitalize font-medium">
                  {day}
                </span>

                <input
                  type="checkbox"
                  {...register(`workingHours.${day}.isOpen`)}
                  disabled={!isEditing && shopId}
                />

                <input
                  type="time"
                  className={inputClass}
                  disabled={
                    !isEditing ||
                    !watch(`workingHours.${day}.isOpen`)
                  }
                  {...register(`workingHours.${day}.open`)}
                />

                <input
                  type="time"
                  className={inputClass}
                  disabled={
                    !isEditing ||
                    !watch(`workingHours.${day}.isOpen`)
                  }
                  {...register(`workingHours.${day}.close`)}
                />
              </div>
            ))}
          </div>
        </Section>

        {(isEditing || !shopId) && (
          <div className="flex gap-3">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">
              Save
            </button>

            {shopId && (
              <button type="button" onClick={cancelEdit} className="px-6 py-2 bg-gray-300 rounded">
                Cancel
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

/* ---------- Helper Components ---------- */

function Section({ title, children }) {
  return (
    <section className="border p-4 rounded space-y-4">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}