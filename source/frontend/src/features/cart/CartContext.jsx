import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import {useAuth} from '../auth/AuthContext.jsx';

import {
  addCartItem,
  cartErrorMessage,
  clearCart,
  fetchCart,
  mergeGuestCart,
  peekGuestToken,
  removeCartItem,
  updateCartItem
} from './cartApi.js';

const emptyCart = {
  cartId: null,
  items: [],
  totalItems: 0,
  subtotal: 0
};

const CartContext = createContext(null);

export function CartProvider({children}) {
  const {user, loading: authLoading} = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const data = await fetchCart();
    setCart(data);
    return data;
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;

    let active = true;
    setLoading(true);
    setError('');

    const guestToken = peekGuestToken();
    const operation = user && guestToken
      ? mergeGuestCart(guestToken)
      : fetchCart();

    operation
      .then(data => {
        if (active) setCart(data);
      })
      .catch(requestError => {
        if (!active) return;

        setCart(emptyCart);
        setError(
          cartErrorMessage(
            requestError,
            'Không thể tải giỏ hàng.'
          )
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const add = useCallback(async input => {
    const data = await addCartItem(input);
    setCart(data);
    return data;
  }, []);

  const update = useCallback(async (variantId, quantity) => {
    const data = await updateCartItem(variantId, quantity);
    setCart(data);
    return data;
  }, []);

  const remove = useCallback(async variantId => {
    const data = await removeCartItem(variantId);
    setCart(data);
    return data;
  }, []);

  const clear = useCallback(async () => {
    const data = await clearCart();
    setCart(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      refresh,
      add,
      update,
      remove,
      clear
    }),
    [cart, loading, error, refresh, add, update, remove, clear]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return value;
}
