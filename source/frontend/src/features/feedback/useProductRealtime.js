import {useEffect, useRef, useState} from 'react';
import {io} from 'socket.io-client';

export function useProductRealtime(productId, callbacks = {}) {
  const callbacksRef = useRef(callbacks);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    if (!productId) return undefined;

    const socket = io({
      path: '/socket.io',
      transports: ['websocket']
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('product:join', productId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('comment.created', event => {
      if (event.productId === productId) {
        callbacksRef.current.onComment?.(event);
      }
    });
    socket.on('rating.updated', event => {
      if (event.productId === productId) {
        callbacksRef.current.onRating?.(event);
      }
    });

    return () => {
      socket.emit('product:leave', productId);
      socket.disconnect();
    };
  }, [productId]);

  return connected;
}
