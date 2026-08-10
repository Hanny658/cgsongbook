# cgsongbook
The online Care Group Songbook based on Sky's 2025 CG Songbook (Received from Anchor Point CG) + Hanny's Favorite Songs.

Hosted on [CG Songbook Website](https://cgsongbook.org) >

My database for songs are open-sourced and open-data. > [Songbook DB](https://github.com/Hanny658/songbook-db) <\
If you wish to host a Christian song site for your ministry, feel free to use the song data json that I designed and stored in the DB repository, or migrate to a real Relational Database.

JSON Structure: 
```
songdata/[number].json\
├─ title        : string\
├─ link?        : string\
├─ number       : number\
├─ lyrics       : SongSection[]\
│   ├─ [0]\
│   │   ├─ id   : string\
│   │   ├─ label: string\
│   │   └─ lines: SongLine[]\
│   │       ├─ [0]\
│   │       │   ├─ chords: string\
│   │       │   └─ lyrics: string\
│   │       └─ [1…n]\
│   └─ [1…n]\
└─ song         : string[]\
    ├─ [0]: string\
    └─ [1…n]: string
```

For Typescript interfaces, see [Inbuilt Interfaces](/types/songdata.d.ts).

Licenced by GPL as I wish to spread the spirit of open-source community, let's share your amazing work with the world!
