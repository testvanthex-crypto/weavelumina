ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255),
  ADD UNIQUE INDEX `users_email_unique` (`email`);
