import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, ScrollView } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Table, Row } from 'react-native-table-component';


export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  const [arr, setArr] = useState([]);
  const [urls, setUrls] = useState({});
  const colNames = ['Coil No.', 'Order Thick', 'Order Width', 'Length', 'Net Weight', 'Color Code'];

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  // run this when successfully scanned a qr code
  const handleBarCodeScanned = ({ type, data }) => {
    const url = data;
    if (!(url in urls)) getHTML(url);
  }

  // add one row, the state is readonly, have to copy and setState
  const updateArr = (url, obj) => {
    let newUrls = Object.assign({}, urls); // shallow copy
    let newArr = [...arr];
    newUrls[url] = obj;
    newArr.push(obj);
    if (!(url in urls)) {
      setUrls(newUrls);
      setArr(newArr);
    }
  }

  // input table colume name, output corresponding data
  const tabelData = (html, colName) => {
    // we got: <th>colName</th><td>number</td>, we want: number
    const re = new RegExp(`${colName}<[^>]*>[^<]*<[^>]*>([^<]*)<`);
    const match = html.match(re);
    if (match && match[1]) return match[1];
    return undefined;
  }

  // get data from html text
  const parseHTML = (url, html) => {
    var obj = {}
    colNames.forEach((colName) => {
      if (colName !== 'Color Code') obj[colName] = tabelData(html, colName)
      else obj[colName] = tabelData(html, '顏色編號')
    })
    // console.log(JSON.stringify(obj));
    if (obj && Object.keys(obj).length !== 0)
      updateArr(url, obj);
  }

  // get html from url
  const getHTML = (url) => {
    console.log(url);
    fetch(url, { headers: { 'Accept-Language': 'en-US,en;q=0.5' } }).then((data) => {
      if (data.status === 200) {
        data.text().then(
          (html) => {
            html = html.replace(/<\s*br\s*>/g, ' ');  // remove newline (<br>)
            parseHTML(url, html);                     // get data from html text
          }
        ).catch((error) => { console.log('Error: 1', error); });
      }
    }).catch((error) => { console.log('Error: 2', error); });
  }
  // TODO
  const toXLS = async (url) => {
    var ws = XLSX.utils.json_to_sheet(arr);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "coil");
    const wbout = XLSX.write(wb, {
      type: 'base64',
      bookType: "xlsx"
    });
    const uri = FileSystem.cacheDirectory + 'coil.xlsx';
    console.log(`Writing to ${JSON.stringify(uri)} with text: ${wbout}`);
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'MyWater data',
      UTI: 'com.microsoft.excel.xlsx'
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.sacanner}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ height: 300, width: 300 }}
        />
      </View>

      <ScrollView style={styles.ScrollView} contentContainerStyle={styles.tableView}>
        <Table borderStyle={{ borderWidth: 1 }}>
          <Row data={colNames} style={styles.rowStyle} textStyle={styles.text} />
          {arr.map((obj, index) => {
            let row = colNames.map((col) => col in obj ? obj[col] : '')
            return (
              <Row key={index} data={row} style={styles.rowStyle} textStyle={styles.text} />
            )
          })}
        </Table>
      </ScrollView>
      <View style={{ margin: 20, }}>
        {/* TODO */}
        <Button onPress={undefined} color="#FA8072" title="download" />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff'
  },
  sacanner: {
    height: 300,
    width: 300,
    borderRadius: 30,
    marginTop: 50,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  ScrollView: {
    borderWidth: 0.5,
    marginTop: 20,
  },
  tableView: {
    width: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowStyle: {
    height: 40,
    width: 300,
    alignContent: "center",
  },
  text: {
    textAlign: 'center',
    margin: 0.5,
    fontSize: 9,
  }
});
