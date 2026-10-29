-- Reassign any legacy CEO users to ADMIN before removing enum value
UPDATE "User" SET role = 'ADMIN' WHERE role = 'CEO';
