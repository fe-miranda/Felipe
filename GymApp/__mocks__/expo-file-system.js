class MockFile {
  constructor(...uris) {
    this.uri = `file:///tmp/${uris[uris.length - 1] || 'file.txt'}`;
  }
  write() {}
}

module.exports = {
  File: MockFile,
  Paths: { cache: 'file:///tmp/' },
};
