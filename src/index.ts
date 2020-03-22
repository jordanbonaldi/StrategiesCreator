import BinanceAlgorithmTests from "./tests/BinanceAlgorithmTests";
import {Trade} from "@jordanbonaldi/indicatorsapi";
import StrategyResult from "./algorithms/StrategyResult";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBacktestOnAsset('IchimokuLongStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }))
    .then((trades: StrategyResult | Error) => console.log(trades))
;

