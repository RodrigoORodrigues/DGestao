const tests = [
  "123456789 12345 NOME DA EMPRESA LTDA 2 10/10/2023 1.000,00 1.000,00 5 100,00 12345 CORRETORA 1 A"
];

const hapvidaRegex = /(\d{8,})\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s+(\d+)\s+([\d.,]+)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+[A-Z]/g;

let match;
while ((match = hapvidaRegex.exec(tests[0])) !== null) {
    console.log("match 3 (cliente):", match[3]);
    console.log("match 4:", match[4]);
    console.log("match 5 (data):", match[5]);
    console.log("match 6:", match[6]);
    console.log("match 7:", match[7]);
    console.log("match 8:", match[8]);
    console.log("match 9:", match[9]);
}
