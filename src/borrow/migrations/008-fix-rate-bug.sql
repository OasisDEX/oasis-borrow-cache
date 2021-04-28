DELETE FROM vault.events WHERE kind like 'MOVE_SRC';
DELETE FROM vault.events WHERE kind like 'MOVE_DEST';

DELETE FROM vault.events WHERE kind like 'DEPOSIT';
DELETE FROM vault.events WHERE kind like 'GENERATE';
DELETE FROM vault.events WHERE kind like 'WITHDRAW';
DELETE FROM vault.events WHERE kind like 'PAYBACK';
DELETE FROM vault.events WHERE kind like 'DEPOSIT-GENERATE';
DELETE FROM vault.events WHERE kind like 'WITHDRAW-PAYBACK';
