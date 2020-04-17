import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";
import { Trade } from ".";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runStrategyOnAsset('XmaRsiStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }).then((trade: any) => console.log(trade)));

