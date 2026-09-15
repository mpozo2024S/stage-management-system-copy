import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getItems,
  getCategories,
  getLocations,
  createItem,
  updateItem,
  deleteItem,
  patchItemQuantity,
  uploadItemPhoto,
} from "../services/itemsService.js";

/**
 * Compress an image File using a canvas before uploading.
 * maxWidthPx=1200, quality=0.75 keeps file size reasonable without visible quality loss.
 */
function compressImage(file, { maxWidthPx = 1200, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => blob
          ? resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }))
          : reject(new Error("Canvas compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

const ItemsContext = createContext(null);

export function ItemsProvider({ children }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [editItemLoading, setEditItemLoading] = useState(false);
  const [removeItemLoading, setRemoveItemLoading] = useState(false);
  const [adjustQuantityLoading, setAdjustQuantityLoading] = useState(false);
  const [uploadPhotoLoading, setUploadPhotoLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, catsData, locsData] = await Promise.all([
        getItems(),
        getCategories(),
        getLocations(),
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setLocations(locsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  const addItem = useCallback(async (data) => {
    setAddItemLoading(true);
    setError(null);
    try {
      const created = await createItem(data);
      await refresh();
      return created;
    } catch (err) {
      setError(err.message || "Failed to add item");
      throw err;
    } finally {
      setAddItemLoading(false);
    }
  }, [refresh]);

  const editItem = useCallback(async (id, data) => {
    setEditItemLoading(true);
    setError(null);
    try {
      const updated = await updateItem(id, data);
      await refresh();
      return updated;
    } catch (err) {
      setError(err.message || "Failed to update item");
      throw err;
    } finally {
      setEditItemLoading(false);
    }
  }, [refresh]);

  const removeItem = useCallback(async (id) => {
    setRemoveItemLoading(true);
    setError(null);
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete item");
      throw err;
    } finally {
      setRemoveItemLoading(false);
    }
  }, []);

  const adjustQuantity = useCallback(async (id, change) => {
    setAdjustQuantityLoading(true);
    setError(null);
    try {
      const updated = await patchItemQuantity(id, change);
      
      setItems((prev) =>
        prev.map((i) => 
          (i.id === id ? { ...i, available_quantity: updated.available_quantity } : i)
        )
      );
      
      return updated;
    } catch (err) {
      console.error("Failed to adjust quantity:", err);
      setError(err.message || "Failed to update quantity. Please try again.");
      throw err; 
    } finally {
      setAdjustQuantityLoading(false);
    }
  }, []); 

  const uploadPhoto = useCallback(async (id, file) => {
    setUploadPhotoLoading(true);
    setError(null);
    try {
      const result = await uploadItemPhoto(id, file);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, image_url: result.url } : i))
      );
      return result;
    } catch (err) {
      setError(err.message || "Failed to upload photo");
      throw err;
    } finally {
      setUploadPhotoLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ItemsContext.Provider
      value={{
        items,
        categories,
        locations,
        loading,
        error,
        addItemLoading,
        editItemLoading,
        removeItemLoading,
        adjustQuantityLoading,
        uploadPhotoLoading,
        refresh,
        addItem,
        editItem,
        removeItem,
        adjustQuantity,
        uploadPhoto,
        clearError,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error("useItems must be used inside <ItemsProvider>");
  return ctx;
}