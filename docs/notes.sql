-- ilk with rate
create or replace view maciejk_tests.ilks as
select l.ilk, l.liquidation_ratio, r.rate 
from 
	(values
		('ETH-A', 1.5),
		('ETH-B', 1.3),
		('ETH-C', 1.75),
		('BAT-A', 1.5),
		('USDC-A', 1.01),
		('USDC-B', 1.2),
		('WBTC-A', 1.5),
		('TUSD-A', 1.01),
		('ZRX-A', 1.75),
		('KNC-A', 1.75),
		('MANA-A', 1.75),
		('USDT-A', 1.5),
		('PAXUSD-A', 1.01),
		('COMP-A', 1.75),
		('LRC-A', 1.75),
		('LINK-A', 1.75),
		('BAL-A', 1.75),
		('YFI-A', 1.75),
		('GUSD-A', 1.01),
		('UNI-A', 1.75),
		('AAVE-A', 1.75),
		('UNIV2DAIETH-A', 1.25),
		('UNIV2WBTCETH-A', 1.5),
		('UNIV2USDCETH-A', 1.25),
		('UNIV2DAIUSDC-A', 1.1),
		('UNIV2ETHUSDT-A', 1.4),
		('UNIV2LINKETH-A', 1.65),
		('UNIV2UNIETH-A', 1.65),
		('UNIV2WBTCDAI-A', 1.25),
		('UNIV2AAVEETH-A', 1.65),
		('UNIV2DAIUSDT-A', 1.25)
	) as l (ilk, liquidation_ratio),
	(select i ilk, (10^27 + sum(rate))/10^27 rate 
	from vat.fold group by i) as r
where l.ilk = r.ilk;

-- urns
create or replace view maciejk_tests.urns as 
select
	u.ilk,
	u.urn,
	u.ink collateral,
	u.art * i.rate debt,
	(u.art * i.rate * i.liquidation_ratio) / u.ink liqudation_price
from 
	(
		select ilk, urn, sum(dart)/10^18 art, sum(dink)/10^18 ink
		from (
			select ilk, u urn, dart, dink  from vat.frob
			union all
			select i ilk, u urn, dart, dink  from vat.grab
			union all
			select ilk, src urn, -1 * dart dart, -1 * dink dart from vat.fork
			union all
			select ilk, dst urn, dart, dink from vat.fork	
		) x
		group by ilk, urn
	) u,
	maciejk_tests.ilks i
where
	u.ilk = i.ilk;

-- urns with cdp_id
create or replace view maciejk_tests.urns_with_cdp_id as
select u.*, c.cdp_id
from maciejk_tests.urns u
left join manager.cdp c
on u.urn = c.urn;


-- liquidations
select 
	u.ilk, 
	bs.timestamp start_timestamp, 
	be.timestamp end_timestamp, 
	age(be.timestamp, bs.timestamp) duration,
	t.*
from 
	vulcan2x.block bs,	
	vulcan2x.block be,
	maciejk_tests.urns u,
	clipper.kick k, 
	(
		select
			max(block_id) block_id,
			auction_id, usr urn, 
			sum(owe)/10^45 tab, sum((owe/price))/10^18 lot, 
			min(tab)/10^45 remaining_tab, min(lot)/10^18 remainging_lot
		from clipper.take
		group by auction_id, usr
	) t	
where
	t.block_id = be.id and
	k.block_id = bs.id and
	t.urn = u.urn and
 	k.usr = u.urn and 
 	k.auction_id = t.auction_id
order by bs.timestamp desc;
