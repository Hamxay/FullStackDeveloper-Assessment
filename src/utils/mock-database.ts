import { User } from '../types';

// Mock user database
export const mockUsers: Record<number, User> = {
  1: { id: 1, name: 'John Doe', email: 'john@example.com' },
  2: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  3: { id: 3, name: 'Alice Johnson', email: 'alice@example.com' },
};

/**
 * Simulates a database call with a 200ms delay
 */
export async function fetchUserFromDatabase(userId: number): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId];
      if (user) {
        resolve(user);
      } else {
        reject(new Error(`User with ID ${userId} not found`));
      }
    }, 200);
  });
}

/**
 * Adds a new user to the mock database
 */
export function addUserToDatabase(user: User): void {
  mockUsers[user.id] = user;
}

/**
 * Gets all users from the mock database
 */
export function getAllUsers(): User[] {
  return Object.values(mockUsers);
}

