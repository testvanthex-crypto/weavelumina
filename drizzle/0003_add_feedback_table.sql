CREATE TABLE `feedback` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `orderId` int,
  `rating` int NOT NULL,
  `comment` text,
  `createdAt` timestamp DEFAULT (now()) NOT NULL,
  `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `feedback_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`),
  CONSTRAINT `feedback_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`)
);
