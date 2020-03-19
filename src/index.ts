import BinanceAlgorithmTests from "./tests/BinanceAlgorithmTests";
import {Trade} from "@jordanbonaldi/indicatorsapi";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runStrategyOnAsset('XmaRsiStrategy', {
        asset: 'BTCUSDT',
        timeframe: '4h'
    }))
    .then((trades: Trade | Error) => console.log(trades))
;

