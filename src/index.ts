import BinanceAlgorithmTests from "./tests/BinanceAlgorithmTests";
import {Trade} from "@jordanbonaldi/indicatorsapi";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runStrategyOnAsset('IchimokuLongStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1h'
    }))
    .then((trades: Trade | Error) => console.log(trades))
;

