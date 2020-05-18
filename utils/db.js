require('dotenv').config();
const faunadb = require('faunadb');

const q = faunadb.query;
const client = new faunadb.Client({ secret: process.env.FAUNA_KEY });

const sortByDateAsc = (documents) =>
  documents.sort((a, b) => new Date(b.opened) - new Date(a.opened));

const getRoomByName = async (name) => {
  const { data: documents } = await client.query(
    q.Map(q.Paginate(q.Match(q.Index('find_by_name'), name)), (ref) =>
      q.Get(ref)
    )
  );

  const rooms = documents.map(({ ref, data }) => ({
    id: ref.id,
    ...data,
  }));

  return sortByDateAsc(rooms)[0];
};

const openRoom = async (name) => {
  const document = await client.query(
    q.Create(q.Collection('rooms'), {
      data: {
        name,
        opened: new Date().toString(),
        members: 1,
      },
    })
  );

  return {
    id: document.ref.id,
    ...document.data,
  };
};

const joinRoom = async (name) => {
  const room = await getRoomByName(name);

  const document = await client.query(
    q.Update(q.Ref(q.Collection('rooms'), room.id), {
      data: {
        members: room.members + 1,
      },
    })
  );

  return {
    id: document.ref.id,
    ...document.data,
  };
};

const closeRoom = async (name) => {
  const room = await getRoomByName(name);

  const document = await client.query(
    q.Update(q.Ref(q.Collection('rooms'), room.id), {
      data: {
        closed: new Date().toString(),
      },
    })
  );

  return {
    id: document.ref.id,
    ...document.data,
  };
};

module.exports = {
  openRoom,
  joinRoom,
  closeRoom,
};
