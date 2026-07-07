import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { wishlistKeys } from './useWishlist';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useSocket = (tripId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('joinTrip', { tripId });
    });

    socket.on('joinedRoom', (room) => {
      console.log('Joined room:', room);
    });

    socket.on('scheduleUpdated', () => {
      console.log('Received scheduleUpdated event');
      queryClient.invalidateQueries({ queryKey: ['schedules', tripId] });
      queryClient.invalidateQueries({ queryKey: ['schedule-dates', tripId] });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    });

    socket.on('wishlistUpdated', () => {
      console.log('Received wishlistUpdated event');
      queryClient.invalidateQueries({ queryKey: ['wishlist', tripId] });
    });

    socket.on('commentUpdated', () => {
      console.log('Received commentUpdated event');
      // Comments are usually fetched per wishlistPlaceId, 
      // but invalidating all comments related to this trip is safe enough.
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    });

    socket.on('expenseUpdated', () => {
      console.log('Received expenseUpdated event');
      queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary', tripId] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats', tripId] });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId, queryClient]);
};
