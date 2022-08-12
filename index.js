import axios from 'axios';
import express from 'express'
const app = express()

app.get('/DailyTreasuryYield', async function (req, res) {
    const year = (req.query.year === 'update' ? new Date().getFullYear().toString() : req.query.year)
    const resp = await axios.get('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve&field_tdr_date_value=' + year)

    const data = resp.data
    //console.log(data)

    let date = /time datetime="(.*)">/g
    let regex1Month = /bc-1month.*[^>]>([.0-9]+)/g
    let regex3Month = /bc-3month.*[^>]>([.0-9]+)/g
    let regex6Month = /bc-6month.*[^>]>([.0-9]+)/g
    let regex1Year = /bc-1year.*[^>]>([.0-9]+)/g
    let regex2Year = /bc-2year.*[^>]>([.0-9]+)/g
    let regex3Year = /bc-3year.*[^>]>([.0-9]+)/g

    let ddate = data.match(date).map((entry) => entry.match(/time datetime="(.*)">/)[1])
    let d1Month = data.match(regex1Month).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))
    let d3Month = data.match(regex3Month).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))
    let d6Month = data.match(regex6Month).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))
    let d1Year = data.match(regex1Year).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))
    let d2Year = data.match(regex2Year).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))
    let d3Year = data.match(regex3Year).map((entry) => parseFloat(entry.match(/[.0-9]*$/g)[0]))

    let ret = []
    let count = 0
    ddate.forEach((date) => {
        if (date)
            ret.push({
                date: date,
                //'1month': d1Month[count],
                //'2month': d2Month[count],
                '1month-3month': d1Month[count] - d3Month[count],
                '6month-3year': d6Month[count] - d3Year[count],
                //'6month': d6Month[count],
                //'1year': d1Year[count],
                '1year-2year': d1Year[count] - d2Year[count],
                '6month-2year': d6Month[count] - d2Year[count],
                //'3year': d3Year[count],
                //'5year': d5Year[count],
                //'7year': d7Year[count],
                //'10year': d10Year[count],
                //'20year': d20Year[count],
                //'30year': d30Year[count],
            })
        count++
    })

    res.json(ret)
})

app.get('/DailyTreasuryYieldFormatted', async function (req, res) {
    let getYear = (req.query.year === 'update' ? new Date().getFullYear().toString() : req.query.year)

    axios.get('http://localhost:3000/DailyTreasuryYield?year=' + getYear).then((arr1) => {
        //get years
        let previousYear = (parseInt(getYear) - 1).toString()
        axios.get('http://localhost:3000/DailyTreasuryYield?year=' + previousYear).then((arr2) => {
            let $ = arr1.data.concat(arr2.data)

            let ret = {}
            let years = Object.keys($[0])
            years.forEach((year) => {
                if (year != 'date') {
                    ret[year] = $.map((row) => {
                        return {
                            date: row.date,
                            value: row[year]
                        }
                    })
                }
            })
            res.send(ret)
        })
    })
})

app.get('/DailyTreasuryYieldGraphData', async function (req, res) {
    axios.get('http://localhost:3000/DailyTreasuryYieldFormatted?year=' + req.query.year).then((data) => {
        let chart = {
            animationEnabled: true,
            title: {
                text: "US Treasury Yields"
            },
            subtitles: [{
                text: "High = Bad Econ"
            }],
            axisX: {
                lineColor: "black",
                labelFontColor: "black",
                valueFormatString: "YYYY/MM/DD"
            },
            axisY2: {
                gridThickness: 1,
                title: "Yields",
                suffix: "",
                titleFontColor: "black",
                labelFontColor: "black",
                stripLines: [{
                    value: 0,
                    label: "",
                    labelFontColor: "black",
                    labelAlign: "near",
                    color: 'black'
                }]
            },
            legend: {
                cursor: "pointer"
            },
            toolTip: {
                shared: true
            },
            data: []
        }
        Object.keys(data.data).forEach((year) => {
            let line = {
                type: "spline",
                name: year,
                markerSize: 5,
                axisYType: "secondary",
                showInLegend: true,
                dataPoints: []
            }
            data.data[year].forEach((entry) => {
                if (entry.date && entry.date.length > 5 && entry.value && entry.value > -1 && entry.value < 1)
                    line.dataPoints.push({
                        x: entry.date,
                        y: entry.value
                    })
            })
            chart.data.push(line)
        })
        res.json(chart)
    })
})

app.get('/', async function (req, res) {
    const header = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script><script src="https://canvasjs.com/assets/script/canvasjs.min.js"></script>'
    let body = `<script>
    
    var Chartting = (year) => {
        $.getJSON( './DailyTreasuryYieldGraphData?year=' + year, function( data ) {
            var newData=data
            newData.data = data.data.sort((date,a,b) => {return date}).map((row) => {
                let innerData = row
                row.dataPoints = row.dataPoints.map((dp) => {
                    return {
                        x: dp.x,
                        y: dp.y
                    }
                }).sort((a,b) => {
                    var keyA = new Date(a.x),
                    keyB = new Date(b.x);
                    // Compare the 2 dates
                    if(keyA < keyB) return -1;
                    if(keyA > keyB) return 1;
                    return 0;
                })
                return row
            })
            newData.data = newData.data.map((row) => {
                return {
                    ...row,
                    dataPoints: row.dataPoints.map((inner) => {
                        return {
                            x: new Date(inner.x),
                            y: parseFloat(inner.y)
                        }
                    })
                }
            })
            console.log(newData.data)
            var chart = new CanvasJS.Chart("chartContainer", newData)    
            chart.render();
          });
    }

    window.onload = function () {
        Chartting("`+ (req.query.year ? req.query.year : (new Date()).getFullYear()) + `")    
    }
    </script>
    <div id="chartContainer" style="height: 370px; width: 100%;"></div><div class="slidecontainer">
    <input style="width: 100%;" type="range" min="2008" max="` + (new Date()).getFullYear() + `" value="` + (new Date()).getFullYear() + `" class="slider" id="myRange">
    <p>Year: <span id="YearSliderUS"></span></p></div><script>    
    var slider = document.getElementById("myRange");
    var output = document.getElementById("YearSliderUS");
    output.innerHTML = slider.value;
    slider.oninput = function() {
        output.innerHTML = this.value;  
        StopReloadYear()
        ReloadYear(this.value)     
    }
    
    function StopReloadYear() {
        clearTimeout(OnChangeYear);
    }

    var OnChangeYear;

    function ReloadYear(year) {
        OnChangeYear = setTimeout(function(){
            Chartting(year.toString())
        }, 1000);
    }
    </script>`
    res.send(header + body)
})

app.listen(3000)