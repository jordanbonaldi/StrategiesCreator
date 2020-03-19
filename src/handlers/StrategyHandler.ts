import Strategy, {StrategyParams} from "../algorithms/Strategy";

export default new class StrategyHandler {

    strategy : Strategy< & StrategyParams >[] = [];

    /**
     *
     * @param strategy
     */
    add(strategy: Strategy< & StrategyParams >): void {
       this.strategy.push(strategy);
    }

    /**
     *
     * @param name
     */
    getStrategyByName(name: string): Strategy< & StrategyParams> | undefined {
        return this.strategy.filter((strategy: Strategy< & StrategyParams >) => strategy.name === name)[0];
    }

    getAll(): Strategy< & StrategyParams >[] {
        return this.strategy;
    }


}