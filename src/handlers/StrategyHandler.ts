import Strategy from "../algorithms/Strategy";

export default new class StrategyHandler {

    strategy : Strategy[] = [];

    /**
     *
     * @param strategy
     */
    add(strategy: Strategy): void {
       this.strategy.push(strategy);
    }

    /**
     *
     * @param name
     */
    getStrategyByName(name: string): Strategy | undefined {
        return this.strategy.filter((strategy: Strategy) => strategy.name === name)[0];
    }

    getAll(): Strategy[] {
        return this.strategy;
    }


}