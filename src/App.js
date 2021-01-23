import React, { useEffect, useRef, useState } from 'react';
import { AgGridColumn, AgGridReact } from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';

const SOLUTION_TYPES = {
  BASIC: 'BASIC',
  PA: 'Μέθοδος Παρούσας Αξίας',
  ADA: 'Μέθοδος Αναλυτικού Δείκτη Απόδοσης (Α.Δ.Α.)'
}

class Symbols {
  constructor(symbol, value, start, end = -1) {
    this.symbol = symbol;
    this.value = value;
    this.start = start;
    this.end = end;
  }
}

const App = () => {
    let [height, setHeight] = useState(3);
    let [periods, setPeriods] = useState(10);
    let [typeOfSolution, setTypeOfSolution] = useState(SOLUTION_TYPES.BASIC);
    let [logs, setLogs] = useState('');
    let [colMin, setColMin] = useState(1);
    let [colMax, setColMax] = useState(2);
    let [currRow, setCurrRow] = useState(1);
    let [autoVal, setAutoVal] = useState('');
    let [gridApi, setGridApi] = useState(null);

    const gridRef = useRef(null);

    const populateRowData = () => {
      let rData = {id: 0};
      for (let i=0;i<periods;i++) {
        rData[`period-${i}`] = i;
      }  
  
      // Get item height
      let allItems = [];
      for (let i=0;i<height;i++) {
        let items = {};
        for (let i=0;i<periods;i++) {
          items[`period-${i}`] = '';
        }  
        items.id = i+1;
        allItems.push(items);
      }

      return [rData, ...allItems];
    }

    const [rowData, setRowData] = useState(populateRowData());

    useEffect(() => {
      
    }, [rowData]);

    useEffect(() => {
      setRowData(populateRowData());
      if (gridApi) {
        gridApi.setRowData(populateRowData());
      }
    }, [height, periods]);


    const runCalculations = () => {
        let generatedSymbolsCp = [];
        setLogs('');

        // Goes through each row to find each F individually.
        for(let currRow = 1;currRow < rowData.length; currRow++) {
          // Loop through each period to find each symbol.
          for (let period = 0;period < Object.keys(rowData[currRow]).length; period++) {
            let cellData = rowData[currRow][`period-${period}`];
            if (cellData && cellData.length > 0) {
              generatedSymbolsCp = symbolAddition(cellData, cellData[0], period, generatedSymbolsCp);
            }

          }
        }

        let str = '';
        if (typeOfSolution === SOLUTION_TYPES.BASIC) {
          str += "SOLVING FOR BASIC\n";
          str += "=================\n";
          
          let total = 0;
          console.log(generatedSymbolsCp);
          for(let i=0;i<generatedSymbolsCp.length;i++) {
            if (generatedSymbolsCp[i].symbol === "p") {
              str += `\nCALCULATIONS OF F${i+1}:\n`;
              const ftp = findFtP(0.08, periods - generatedSymbolsCp[i].start - 1).toFixed(3);
              const bigA = generatedSymbolsCp[i].value;
              total += bigA * ftp;
              str += `F${i+1}=A*(F/P, 8%, ${periods - generatedSymbolsCp[i].start - 1}) = ${bigA} * ${ftp}\n`
              str += `F${i+1}=${bigA * ftp}`;
            }
  
            if (generatedSymbolsCp[i].symbol === "a") {
              str += `\nCALCULATING F${i+1}`;
              const bigA = generatedSymbolsCp[i].value.toFixed(3);
              const fta = findFtA(0.08, generatedSymbolsCp[i].end - generatedSymbolsCp[i].start + 1).toFixed(3);
              let intermediateVal = bigA * fta;

              if (periods - parseInt(generatedSymbolsCp[i].end) - 1 !== 0) {
                if (generatedSymbolsCp[i].end !== -1) {
                  intermediateVal *= findFtP(0.08, periods - generatedSymbolsCp[i].end - 1);
                } else {
                  intermediateVal *= findFtP(0.08, periods - generatedSymbolsCp[i].start - 1);
                }
                str += `\nF${i+1} = A*(F/A, 8%, ${generatedSymbolsCp[i].end - generatedSymbolsCp[i].start + 1})\n * (F/P, 8%, ${periods - generatedSymbolsCp[i].end - 1})`;
                str += `\nF${i+1} = ${bigA} * ${fta} * ${findFtP(0.08, periods - generatedSymbolsCp[i].end - 1).toFixed(3)} = ${intermediateVal.toFixed(3)}`;
              } else {
                str += `\nF${i+1} = A*(F/A, 8%, ${periods - generatedSymbolsCp[i].start - 1})\n`;
                str += `\nF${i+1} = ${bigA} * ${fta} = ${bigA * fta} = ${intermediateVal.toFixed(3)}`;
              }
              total += intermediateVal;
            }
          }

        } else if (typeOfSolution === SOLUTION_TYPES.PA) {
          let str2 = '';
          str += `SOLVING FOR ${SOLUTION_TYPES.PA}\n`;
          str += "=================\n";
          str2 += '';
          let total = 0;

          console.log(generatedSymbolsCp);

          generatedSymbolsCp.map( function(symbol) {

            if (symbol.symbol === 'p') {
              str += `P=${symbol.value} `;
              str2 += `P=${symbol.value} `;
              total += symbol.value;
            }

            if (symbol.symbol === 'f') {
              if (symbol.value < 0) {
                str += `-F*(P/F, 8%, ${symbol.start}) `;
              } else {
                str += `F*(P/F, 8%, ${symbol.start}) `;
              }
              
              str2 += `${symbol.value} * ${findPtF(0.08, symbol.start).toFixed(3)} `;
              total += symbol.value * findPtF(0.08, symbol.start).toFixed(3);
            }

            if (symbol.symbol === 'a') {
              if (symbol.value > 0) {
                str += '+'
                str2 += '+'
              } else {
                str += '-'
                str2+= '-'
              }
              if (symbol.start !== 1) {
                str += `A*(P/A, 8%, ${symbol.end - symbol.start + 1}) * (P/F, 8%, ${symbol.start - 1})`;
                str2 += `${symbol.value} * ${findPtA(0.08, symbol.end - symbol.start + 1).toFixed(3)} * ${findPtF(0.08,symbol.start - 1)}`;
                total += symbol.value * findPtA(0.08, symbol.end - symbol.start + 1).toFixed(3) * findPtF(0.08, symbol.start - 1);
              } else {
                str += `A*(P/A, 8%, ${symbol.end - symbol.start + 1})`;
                str2 += `${symbol.value} * ${findPtA(0.08, symbol.end - symbol.start + 1).toFixed(3)}`;
                total += symbol.value * findPtA(0.08, symbol.end - symbol.start + 1).toFixed(3);
              }
            }
          });

          str += `\n${str2}`;
          str += `\nP=${total}`;

          if (total < 0) {
            str += `\nΔεν θα συνιστουσε επένδυση εφόσον ${total} < 0`;
          } else {
            str += `\nΘα συνιστούσε επένδυση εφόσον ${total} > 0`;
          }
        } else if (typeOfSolution === SOLUTION_TYPES.ADA) {

          let yearlyInc;
          let depreciation;
          let yearlyOut;

          generatedSymbolsCp.map( function(symbol) { 
            if (symbol.symbol === 'p') {
              str += `\nΑπόσβεσωση=${parseFloat(symbol.value).toFixed(3) * findAtF(0.08, periods - 1) * -1}`
              depreciation = parseFloat(symbol.value).toFixed(3) * findAtF(0.08, periods - 1) * -1;
            }

            if (symbol.symbol === 'a') {
              if (symbol.value > 0) {
                str += `\nΕτήσια έσοδα=${symbol.value}`
                yearlyInc = parseFloat(symbol.value).toFixed(3);
              } else {
                str += `\nΕτήσια έξοδα=${symbol.value * -1}`
                yearlyOut = parseFloat(symbol.value).toFixed(3) * -1;
              }
            }
          });

          console.log(periods - 1);

          const yearlyTOut = parseFloat(depreciation) + parseFloat(yearlyOut);
          const yearlyTInc = parseFloat(yearlyInc) - parseFloat(yearlyTOut);

          str += `\nΣυνολικό ετησίων εξόδων=${depreciation} + ${yearlyOut}=${yearlyTOut}`;
          str += `\nΕτήσιο Κέρδος= ${yearlyInc} - ${yearlyTOut} = ${yearlyTInc}`
        }

        setLogs(str);
    }

    const symbolAddition = (cellData, symbol, period, generatedSymbolsCp) => {

      if (cellData.includes(symbol) && symbol !== '' && symbol !== null) {
        if (
          generatedSymbolsCp.length > 0 && 
          generatedSymbolsCp[generatedSymbolsCp.length - 1].symbol === symbol &&
          generatedSymbolsCp[generatedSymbolsCp.length - 1].value === stripLetters(cellData)
        ) {
          if (generatedSymbolsCp[generatedSymbolsCp.length - 1].end === -1 && generatedSymbolsCp[generatedSymbolsCp.length - 1].start === period - 1) {
            generatedSymbolsCp[generatedSymbolsCp.length - 1].end = period;
          } else if (generatedSymbolsCp[generatedSymbolsCp.length - 1].end === period - 1) {
            generatedSymbolsCp[generatedSymbolsCp.length - 1].end = period;
          } else {
            generatedSymbolsCp.push(new Symbols(symbol, stripLetters(cellData), period));
          }
        } else {
          generatedSymbolsCp.push(new Symbols(symbol, stripLetters(cellData), period));
        }
      }

      return generatedSymbolsCp;
    }

    const autoPopulate = () => {
      //let rData = [...rowData];

      let node = gridApi.getRowNode(currRow);
      for (let i=parseInt(colMin);i<parseInt(colMax);i++) {
        node.setDataValue(`period-${i}`, autoVal)
      }

    }

    const stripLetters = (str) => {
      return parseFloat(str.substr(2));
    }

    const findAtF = (perc, period) => {
      return perc/((1+perc)**period - 1)
    }

    // const findAtP = (perc, period) => {
    //   return (perc*(1+perc)**period)/(((1+perc)**period) - 1)
    // }

    const findPtA = (perc, period) => {
      return ((1+perc)**period - 1)/(perc*(1+perc)**period);
    }

    const findPtF = (perc, period) => {
      return (1+perc)**-period;
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
                onGridReady={(params) => {
                  setGridApi(params.api);
                }}
                getRowNodeId={(data) => {
                  return data.id;
                }}
                ref={gridRef}
                rowData={rowData}>
                {
                  Object.keys(rowData[0]).filter(key => key !== "id").map( key => {
                    return (
                      <AgGridColumn key={key} width={90} onCellValueChanged={(e) => {}} editable={true} field={key}></AgGridColumn>      
                    )
                  })
                }
            </AgGridReact>
            <div style={{display:'grid', gridTemplateColumns:'auto auto'}}>
                <div>
                  <h1>Actions</h1>
                  <button onClick={() => runCalculations()}>Calcuate F</button>
                  <textarea value={logs}>
                  </textarea>
                </div>
                <div>
                  <h2>Settings</h2>
                  <label>Height:</label>
                  <input type="number" value={height} onChange={(e) => {
                    setHeight(e.currentTarget.value);
                    }} 
                    
                    />

                  <label>Periods:</label>
                  <input type="number" value={periods} onChange={(e) => {setPeriods(e.currentTarget.value)}} />

                  <label>Type of exercise:</label>
                  <select onChange={(e) => {setTypeOfSolution(e.currentTarget.value)}}>
                    {
                      Object.keys(SOLUTION_TYPES).map( sol => {
                        return (
                        <option value={SOLUTION_TYPES[sol]}>{SOLUTION_TYPES[sol]}</option>
                        )
                      })
                    }
                  </select>

                  <h2>Auto populate</h2>
                  <label>row</label>
                  <input type="number" min="1" value={currRow} onChange={(e) => setCurrRow(e.currentTarget.value)} />
                  <label>columns</label>
                  <input type="number" placeholder="from" value={colMin} onChange={(e) => setColMin(e.currentTarget.value)} />
                  <input type="number" placeholder="to"  value={colMax} onChange={(e) => setColMax(e.currentTarget.value)} />
                  <label>Value to input</label>
                  <input type="text" onChange={(e) => setAutoVal(e.currentTarget.value)}/>
                  <button onClick={() => {autoPopulate()}}>Auto-populate</button>
                </div>
            </div>
        </div>
    );
};


export default App;
