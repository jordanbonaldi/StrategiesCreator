import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBacktestOnAsset('IchimokuLongStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }))
    .then((trades: StrategyResult | Error) => console.log(trades))
;

