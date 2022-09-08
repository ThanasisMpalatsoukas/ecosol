import React, { useState } from 'react';
import { AgGridColumn, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';

const HEIGHT = 3;
const PERIODS = 11;

class Symbols {
  constructor(symbol, value, start, end = -1) {
    this.symbol = symbol;
    this.value = value;
    this.start = start;
    this.end = end;
  }
}

const App = () => {
    const [gridApi, setGridApi] = useState(null);
    const [gridColumnApi, setGridColumnApi] = useState(null);
    const [generatedSymbols, setGeneratedSymbols] = useState([]);

    // Populate header.
    let rData = {};
    for (let i=0;i<PERIODS;i++) {
      rData[`period-${i}`] = i;
    }  

    // Get item height
    let allItems = [];
    for (let i=0;i<HEIGHT;i++) {
      let items = {};
      for (let i=0;i<PERIODS;i++) {
        items[`period-${i}`] = '';
      }  
      allItems.push(items);
    }

    const [rowData, setRowData] = useState(
      [rData, ...allItems]
    );

    const runCalculations = () => {

        let generatedSymbolsCp = [];

        // Goes through each row to find each F individually.
        for(let currRow = 1;currRow < rowData.length; currRow++) {
          let f = 0;
          // Loop through each period to find each symbol.
          for (let period = 0;period < Object.keys(rowData[currRow]).length; period++) {
            let cellData = rowData[currRow][`period-${period}`]; 

            if (cellData.length > 0) {
              generatedSymbolsCp = symbolAddition(cellData, cellData[0], period, generatedSymbolsCp);
            }

          }
        }

        let total = 0;
        for(let i=0;i<generatedSymbolsCp.length;i++) {
          if (generatedSymbolsCp[i].symbol === "p") {
            console.log("CALCULATION P");
            total += generatedSymbolsCp[i].value * findFtP(0.08, PERIODS - generatedSymbolsCp[i].start - 1);
            console.log(`P=${generatedSymbolsCp[i].value * findFtP(0.08, PERIODS - generatedSymbolsCp[i].start - 1)}`);
          }

          if (generatedSymbolsCp[i].symbol === "a") {
            console.log("CALCULATING A");
            let intermediateVal = generatedSymbolsCp[i].value * findFtA(0.08, generatedSymbolsCp[i].end - generatedSymbolsCp[i].start + 1);
            console.table(generatedSymbolsCp[i]);
            console.log(`${generatedSymbolsCp[i].value} * ${findFtA(0.08, generatedSymbolsCp[i].end - generatedSymbolsCp[i].start + 1)}`);
            if (generatedSymbolsCp[i].end + 1 !== PERIODS) {
              if (generatedSymbolsCp[i].end !== -1) {
                intermediateVal *= findFtP(0.08, PERIODS - generatedSymbolsCp[i].end - 1);
                //console.log(findFtP(0.08, PERIODS - generatedSymbolsCp[i].end - 1));
              } else {
                intermediateVal *= findFtP(0.08, PERIODS - generatedSymbolsCp[i].start - 1);
              }
              console.log(`*= ${findFtP(0.08, PERIODS - generatedSymbolsCp[i].end - 1)}`);
            }
            total += intermediateVal;
          }
        }

        console.log(total);

    }

    const symbolAddition = (cellData, symbol, period, generatedSymbolsCp) => {

      if (cellData.includes(symbol) && symbol !== '' && symbol !== null) {
        if (
          generatedSymbolsCp.length > 0 && 
          generatedSymbolsCp[generatedSymbolsCp.length - 1].symbol === symbol &&
          generatedSymbolsCp[generatedSymbolsCp.length - 1].value === stripLetters(cellData) 
          ) {
          generatedSymbolsCp[generatedSymbolsCp.length - 1].end = period;
        } else {
          generatedSymbolsCp.push(new Symbols(symbol, stripLetters(cellData), period));
        }
      }

      return generatedSymbolsCp;
    }

    const stripLetters = (str) => {
      return parseFloat(str.substr(2));
    }

    const findAtF = (perc, period) => {
      return perc/((1+perc)**period - 1)
    }

    const findAtP = (perc, period) => {
      return (perc*(1+perc)**period)/(((1+perc)**period) - 1)
    }

    const findPtA = (perc, period) => {
      return ((1+perc)**period - 1)/(perc*(1+perc)**period);
    }

    const findFtP = (perc, period) => {
      return (1 + perc)**period;
    }

    const findFtA = (perc, period) => {
      return ((1+perc)**period - 1)/perc;
    }

    return (
        <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
            <AgGridReact
                rowData={rowData}>
                {
                  Object.keys(rowData[0]).map( key => {
                    return (
                      <AgGridColumn width={100} onCellValueChanged={() => {console.log(rowData)}} editable={true} field={key}></AgGridColumn>      
                    )
                  })
                }
            </AgGridReact>
            <button onClick={() => runCalculations()}>Calcuate F</button>
        </div>
    );
};


export default App;
