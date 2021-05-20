DELETE FROM clipper.kick;
DELETE FROM clipper.redo;
DELETE FROM clipper.take;
DELETE FROM clipper.yank;

DELETE FROM vault.events WHERE kind = 'AUCTION_STARTED_V2';
DELETE FROM vault.events WHERE kind = 'TAKE';

DELETE FROM vulcan2x.job WHERE name LIKE 'clipperTransformer';
DELETE FROM vulcan2x.job WHERE name LIKE 'auctionTransformer-lig2.0-%';
